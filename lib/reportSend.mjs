/**
 * Orchestrates analytics report generation and Resend delivery.
 * Never logs API keys, full email bodies, or customer PII.
 */
import {
  getPriorMonthRange,
  getPriorWeekRange,
  getPreviousMonthRange,
  getPreviousWeekRange,
  getDueReportPeriods,
} from './reportTime.mjs'
import { buildReportPayload } from './reportMetrics.mjs'
import { buildPlainLanguageSummary } from './reportSummary.mjs'
import { buildReportEmail } from './reportEmail.mjs'
import {
  assertSendableEmailBodies,
  buildReportDiagnostics,
  normalizeEmailBodies,
} from './reportBody.mjs'
import {
  acquireReportLock,
  getDeliveryRecord,
  getReportSettings,
  releaseReportLock,
  saveDeliveryRecord,
  wasSuccessfullyDelivered,
} from './reportStore.mjs'

const BUSINESS_NAME = "Mike's Exterior Cleaning Services"
const ADMIN_URL = 'https://www.mikesexteriorcleaning.com/admin/dashboard'

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() || ''
  const to = process.env.ANALYTICS_REPORT_TO_EMAIL?.trim() || ''
  const from = process.env.ANALYTICS_REPORT_FROM_EMAIL?.trim() || ''
  return { apiKey, to, from }
}

export function assertEmailConfig() {
  const { apiKey, to, from } = getEmailConfig()
  const missing = []
  if (!apiKey) missing.push('RESEND_API_KEY')
  if (!to) missing.push('ANALYTICS_REPORT_TO_EMAIL')
  if (!from) missing.push('ANALYTICS_REPORT_FROM_EMAIL')
  if (missing.length) {
    const err = new Error(`Missing email configuration: ${missing.join(', ')}`)
    err.status = 503
    err.code = 'email_config'
    throw err
  }
  return { apiKey, to, from }
}

async function sendViaResend({ apiKey, from, to, subject, html, text }) {
  const bodies = assertSendableEmailBodies({ html, text })
  if (!bodies.ok) {
    const err = new Error(bodies.error)
    err.status = 500
    err.code = 'empty_email_body'
    err.htmlChars = bodies.htmlChars
    err.textChars = bodies.textChars
    throw err
  }

  const payload = {
    from,
    to: [to],
    subject: String(subject || '').trim() || 'Website report',
    html: bodies.html,
    text: bodies.text,
  }

  // Safety: never send if JSON would omit content fields
  const serialized = JSON.stringify(payload)
  if (!serialized.includes('"html":') || !serialized.includes('"text":')) {
    const err = new Error('Email JSON payload missing html/text fields. Send aborted.')
    err.status = 500
    err.code = 'email_serialize'
    throw err
  }

  console.info('[reportSend] resend request', {
    htmlChars: bodies.htmlChars,
    textChars: bodies.textChars,
    subjectChars: payload.subject.length,
    toConfigured: Boolean(to),
    fromConfigured: Boolean(from),
  })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: serialized,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const reason = data?.message || data?.error || `Resend HTTP ${res.status}`
    const err = new Error(String(reason).slice(0, 300))
    err.status = 502
    err.code = 'resend_failed'
    throw err
  }
  return { id: data?.id || null, htmlChars: bodies.htmlChars, textChars: bodies.textChars }
}

/**
 * Build report content. Template helpers are synchronous; wrapped in Promise.resolve
 * so Production always treats generation as a completed async step.
 */
export async function generateReportContent(type, range, priorRange) {
  const payload = await buildReportPayload(range, priorRange)
  const summaryLines = buildPlainLanguageSummary(payload, type)
  const email = await Promise.resolve(
    buildReportEmail({
      type,
      payload,
      summaryLines,
      adminUrl: ADMIN_URL,
      businessName: BUSINESS_NAME,
    }),
  )

  const bodies = normalizeEmailBodies(email)
  if (!bodies.htmlChars || !bodies.textChars) {
    const err = new Error('Report template produced an empty html or text body')
    err.status = 500
    err.code = 'empty_template'
    err.htmlChars = bodies.htmlChars
    err.textChars = bodies.textChars
    throw err
  }

  const normalizedEmail = {
    subject: String(email.subject || '').trim(),
    html: bodies.html,
    text: bodies.text,
  }

  const diagnostics = buildReportDiagnostics({
    type,
    range,
    payload,
    subject: normalizedEmail.subject,
    html: normalizedEmail.html,
    text: normalizedEmail.text,
    from: process.env.ANALYTICS_REPORT_FROM_EMAIL?.trim() || '',
  })

  return { payload, summaryLines, email: normalizedEmail, range, diagnostics }
}

function publicRunResult(base, extras = {}) {
  // Never return full HTML/text/payload in API responses (size + privacy).
  const delivery = extras.delivery
    ? {
        id: extras.delivery.id,
        type: extras.delivery.type,
        periodKey: extras.delivery.periodKey,
        startDate: extras.delivery.startDate,
        endDate: extras.delivery.endDate,
        label: extras.delivery.label,
        status: extras.delivery.status,
        sentAt: extras.delivery.sentAt,
        recipient: extras.delivery.recipient,
        providerMessageId: extras.delivery.providerMessageId,
        failureReason: extras.delivery.failureReason,
        subject: extras.delivery.subject,
        createdAt: extras.delivery.createdAt,
        updatedAt: extras.delivery.updatedAt,
        hasPreview: Boolean(extras.delivery.htmlPreview || extras.delivery.textPreview),
        htmlChars: extras.delivery.htmlChars ?? extras.diagnostics?.htmlChars ?? null,
        textChars: extras.delivery.textChars ?? extras.diagnostics?.textChars ?? null,
      }
    : undefined

  return {
    ...base,
    diagnostics: extras.diagnostics || null,
    delivery,
    providerMessageId: extras.providerMessageId || null,
    error: extras.error || undefined,
  }
}

/**
 * @param {'weekly'|'monthly'} type
 * @param {object} options
 * @param {boolean} [options.force] - allow resend even if previously sent
 * @param {boolean} [options.send] - actually send email
 * @param {boolean} [options.isTest] - mark as test (uses test subject prefix; still sends if send=true)
 * @param {object} [options.range] - override range
 * @param {object} [options.priorRange]
 */
export async function runReport(type, options = {}) {
  const { force = false, send = true, isTest = false } = options
  const range =
    options.range ||
    (type === 'weekly' ? getPreviousWeekRange() : getPreviousMonthRange())
  const priorRange =
    options.priorRange ||
    (type === 'weekly' ? getPriorWeekRange(range) : getPriorMonthRange(range))

  const existing = await getDeliveryRecord(range.periodKey)
  if (send && !force && !isTest && wasSuccessfullyDelivered(existing)) {
    return publicRunResult(
      {
        ok: true,
        skipped: true,
        reason: 'already_sent',
        periodKey: range.periodKey,
      },
      { delivery: existing },
    )
  }

  if (send && !isTest) {
    const locked = await acquireReportLock(range.periodKey)
    if (!locked) {
      return publicRunResult({
        ok: true,
        skipped: true,
        reason: 'locked',
        periodKey: range.periodKey,
      })
    }
  }

  try {
    const { email, diagnostics } = await generateReportContent(type, range, priorRange)
    const subject = isTest ? `[TEST] ${email.subject}` : email.subject

    if (!send) {
      const previewRecord = await saveDeliveryRecord({
        type,
        periodKey: `${range.periodKey}:preview:${Date.now()}`,
        startDate: range.startDate,
        endDate: range.endDate,
        label: range.label,
        status: 'preview',
        subject,
        htmlPreview: email.html,
        textPreview: email.text,
        htmlChars: diagnostics.htmlChars,
        textChars: diagnostics.textChars,
        recipient: null,
      })
      return {
        ok: true,
        preview: true,
        periodKey: range.periodKey,
        subject,
        // Preview action may include bodies for in-admin iframe only.
        html: email.html,
        text: email.text,
        diagnostics,
        delivery: {
          id: previewRecord.id,
          type: previewRecord.type,
          periodKey: previewRecord.periodKey,
          status: previewRecord.status,
          subject: previewRecord.subject,
          hasPreview: true,
          htmlChars: diagnostics.htmlChars,
          textChars: diagnostics.textChars,
        },
      }
    }

    const bodyGate = assertSendableEmailBodies(email)
    if (!bodyGate.ok) {
      console.error('[reportSend] refusing empty body', {
        htmlChars: bodyGate.htmlChars,
        textChars: bodyGate.textChars,
        periodKey: range.periodKey,
        type,
      })
      return publicRunResult(
        {
          ok: false,
          sent: false,
          periodKey: range.periodKey,
        },
        {
          diagnostics: { ...diagnostics, bodiesReady: false, htmlChars: bodyGate.htmlChars, textChars: bodyGate.textChars },
          error: bodyGate.error,
        },
      )
    }

    const { apiKey, to, from } = assertEmailConfig()
    const diagnosticsWithFrom = { ...diagnostics, fromAddress: from, fromMatchesExpected: from.toLowerCase().includes('reports@reports.mikesexteriorcleaning.com') }

    try {
      const result = await sendViaResend({
        apiKey,
        from,
        to,
        subject,
        html: bodyGate.html,
        text: bodyGate.text,
      })

      const delivery = await saveDeliveryRecord({
        type,
        periodKey: isTest ? `${range.periodKey}:test:${Date.now()}` : range.periodKey,
        startDate: range.startDate,
        endDate: range.endDate,
        label: range.label,
        status: 'sent',
        sentAt: new Date().toISOString(),
        recipient: to,
        providerMessageId: result.id,
        subject,
        htmlPreview: bodyGate.html,
        textPreview: bodyGate.text,
        htmlChars: bodyGate.htmlChars,
        textChars: bodyGate.textChars,
      })

      return publicRunResult(
        {
          ok: true,
          sent: true,
          periodKey: range.periodKey,
        },
        {
          delivery,
          providerMessageId: result.id,
          diagnostics: diagnosticsWithFrom,
        },
      )
    } catch (err) {
      const delivery = await saveDeliveryRecord({
        type,
        periodKey: isTest ? `${range.periodKey}:test-failed:${Date.now()}` : range.periodKey,
        startDate: range.startDate,
        endDate: range.endDate,
        label: range.label,
        status: 'failed',
        sentAt: null,
        recipient: to,
        providerMessageId: null,
        failureReason: err?.message || 'Send failed',
        subject,
        htmlPreview: bodyGate.html,
        textPreview: bodyGate.text,
        htmlChars: bodyGate.htmlChars,
        textChars: bodyGate.textChars,
      })
      return publicRunResult(
        {
          ok: false,
          sent: false,
          periodKey: range.periodKey,
        },
        {
          delivery,
          diagnostics: diagnosticsWithFrom,
          error: err?.message || 'Send failed',
        },
      )
    }
  } finally {
    if (send && !isTest) {
      await releaseReportLock(range.periodKey).catch(() => {})
    }
  }
}

/**
 * Daily cron: send weekly on Mondays and monthly on the 1st (Pacific).
 */
export async function runScheduledReports(now = new Date()) {
  const settings = await getReportSettings()
  const due = getDueReportPeriods(now)
  const results = []

  if (due.weekly) {
    if (!settings.weeklyEnabled) {
      results.push({ type: 'weekly', skipped: true, reason: 'disabled', periodKey: due.weekly.periodKey })
    } else {
      results.push({ type: 'weekly', ...(await runReport('weekly', { range: due.weekly, priorRange: getPriorWeekRange(due.weekly) })) })
    }
  } else {
    results.push({ type: 'weekly', skipped: true, reason: 'not_due' })
  }

  if (due.monthly) {
    if (!settings.monthlyEnabled) {
      results.push({ type: 'monthly', skipped: true, reason: 'disabled', periodKey: due.monthly.periodKey })
    } else {
      results.push({
        type: 'monthly',
        ...(await runReport('monthly', { range: due.monthly, priorRange: getPriorMonthRange(due.monthly) })),
      })
    }
  } else {
    results.push({ type: 'monthly', skipped: true, reason: 'not_due' })
  }

  return {
    ok: true,
    ranAt: new Date().toISOString(),
    results,
  }
}

export function verifyCronSecret(req) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return { ok: false, status: 503, error: 'CRON_SECRET not configured' }

  const auth = String(req.headers?.authorization || '')
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const headerSecret = String(req.headers?.['x-cron-secret'] || '').trim()
  const querySecret = typeof req.query?.secret === 'string' ? req.query.secret.trim() : ''

  if (bearer === secret || headerSecret === secret || querySecret === secret) {
    return { ok: true }
  }
  return { ok: false, status: 401, error: 'Unauthorized' }
}
