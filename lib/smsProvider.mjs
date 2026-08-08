/**
 * SMS provider adapter (Twilio) with dry-run / disabled modes.
 * No API keys are logged. Real sends require SMS_ENABLED=true + Twilio env vars.
 */
import { getTwilioConfig, isSmsSendingEnabled } from './smsConfig.mjs'
import { phoneDigits } from './leadsStore.mjs'

function normalizeE164Us(phone) {
  const digits = phoneDigits(phone)
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (String(phone || '').trim().startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`
  }
  // Allow already-plausible international digit strings
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return null
}

export function sanitizeSmsError(err) {
  const msg = String(err?.message || err || 'SMS send failed')
    .replace(/AC[a-f0-9]{30,}/gi, '[redacted-sid]')
    .replace(/[A-Za-z0-9]{32,}/g, '[redacted]')
    .slice(0, 240)
  return msg
}

/**
 * @param {{ to: string, body: string, kind?: string, leadId?: string|null }} opts
 * @param {{ sendFn?: Function, forceDryRun?: boolean }} [deps]
 */
export async function sendSms({ to, body, kind = 'transactional', leadId = null } = {}, deps = {}) {
  const text = String(body || '').trim()
  const toNorm = normalizeE164Us(to)
  if (!toNorm) {
    return { ok: false, skipped: true, reason: 'invalid_phone', kind, leadId }
  }
  if (!text) {
    return { ok: false, skipped: true, reason: 'empty_body', kind, leadId }
  }

  if (typeof deps.sendFn === 'function') {
    const result = await deps.sendFn({ to: toNorm, body: text, kind, leadId })
    return { ok: true, dryRun: Boolean(result?.dryRun), sid: result?.sid || null, to: toNorm, kind, leadId, ...result }
  }

  if (deps.forceDryRun === true || !isSmsSendingEnabled()) {
    console.info('[sms] dry-run (sending disabled)', {
      kind,
      leadId: leadId || null,
      toSuffix: toNorm.slice(-4),
      bodyLength: text.length,
    })
    return { ok: true, dryRun: true, sid: 'dry_run', to: toNorm, kind, leadId, reason: 'sending_disabled' }
  }

  const { accountSid, authToken, fromNumber } = getTwilioConfig()
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const params = new URLSearchParams({
    To: toNorm,
    From: fromNumber,
    Body: text,
  })

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const errMsg = sanitizeSmsError(data?.message || `Twilio HTTP ${res.status}`)
      console.error('[sms] twilio send failed', {
        kind,
        leadId: leadId || null,
        status: res.status,
        code: data?.code || null,
        error: errMsg,
      })
      return { ok: false, error: errMsg, kind, leadId, to: toNorm }
    }
    console.info('[sms] sent', {
      kind,
      leadId: leadId || null,
      toSuffix: toNorm.slice(-4),
      sidSuffix: String(data?.sid || '').slice(-6) || null,
    })
    return { ok: true, sid: data?.sid || null, to: toNorm, kind, leadId, dryRun: false }
  } catch (err) {
    const errMsg = sanitizeSmsError(err)
    console.error('[sms] send error', { kind, leadId: leadId || null, error: errMsg })
    return { ok: false, error: errMsg, kind, leadId, to: toNorm }
  }
}

export { normalizeE164Us }
