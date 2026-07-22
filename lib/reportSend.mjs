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
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const reason = data?.message || data?.error || `Resend HTTP ${res.status}`
    const err = new Error(String(reason).slice(0, 300))
    err.status = 502
    err.code = 'resend_failed'
    throw err
  }
  return { id: data?.id || null }
}

export async function generateReportContent(type, range, priorRange) {
  const payload = await buildReportPayload(range, priorRange)
  const summaryLines = buildPlainLanguageSummary(payload, type)
  const email = buildReportEmail({
    type,
    payload,
    summaryLines,
    adminUrl: ADMIN_URL,
    businessName: BUSINESS_NAME,
  })
  return { payload, summaryLines, email, range }
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
    return {
      ok: true,
      skipped: true,
      reason: 'already_sent',
      periodKey: range.periodKey,
      delivery: existing,
    }
  }

  if (send && !isTest) {
    const locked = await acquireReportLock(range.periodKey)
    if (!locked) {
      return {
        ok: true,
        skipped: true,
        reason: 'locked',
        periodKey: range.periodKey,
      }
    }
  }

  try {
    const { payload, summaryLines, email } = await generateReportContent(type, range, priorRange)
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
        recipient: null,
      })
      return {
        ok: true,
        preview: true,
        periodKey: range.periodKey,
        subject,
        html: email.html,
        text: email.text,
        summaryLines,
        payload,
        delivery: previewRecord,
      }
    }

    const { apiKey, to, from } = assertEmailConfig()

    try {
      const result = await sendViaResend({
        apiKey,
        from,
        to,
        subject,
        html: email.html,
        text: email.text,
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
        htmlPreview: email.html,
        textPreview: email.text,
      })

      return {
        ok: true,
        sent: true,
        periodKey: range.periodKey,
        delivery,
        providerMessageId: result.id,
      }
    } catch (err) {
      const delivery = await saveDeliveryRecord({
        type,
        periodKey: range.periodKey,
        startDate: range.startDate,
        endDate: range.endDate,
        label: range.label,
        status: 'failed',
        sentAt: null,
        recipient: to,
        providerMessageId: null,
        failureReason: err?.message || 'Send failed',
        subject,
        htmlPreview: email.html,
        textPreview: email.text,
      })
      return {
        ok: false,
        sent: false,
        periodKey: range.periodKey,
        error: err?.message || 'Send failed',
        delivery,
      }
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
