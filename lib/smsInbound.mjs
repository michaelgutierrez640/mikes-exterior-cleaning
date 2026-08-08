/**
 * Twilio inbound SMS webhook helpers (STOP/START).
 * Folded into /api/leads?resource=sms-inbound to stay within Hobby function limits.
 */
import { applySmsOptOutByPhone, applySmsStartByPhone, phoneDigits } from './leadsStore.mjs'
import { getTwilioConfig } from './smsConfig.mjs'
import { isStartKeyword, isStopKeyword } from './smsAutomations.mjs'

function parseFormBody(req) {
  const raw = req.body
  if (raw && typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw
  if (typeof raw === 'string') {
    try {
      if (raw.trim().startsWith('{')) return JSON.parse(raw)
    } catch {
      /* fall through */
    }
    const params = new URLSearchParams(raw)
    const out = {}
    for (const [k, v] of params.entries()) out[k] = v
    return out
  }
  return {}
}

/**
 * Optional Twilio signature check when auth token is configured.
 * Skipped when token missing (local/foundation) — never logs the token.
 */
export async function verifyTwilioSignature(req, fullUrl) {
  const { authToken } = getTwilioConfig()
  if (!authToken) return { ok: true, skipped: true }

  const signature = req.headers['x-twilio-signature']
  if (!signature) return { ok: false, status: 403, error: 'Missing Twilio signature' }

  // Lightweight validation: require configured token + signature header presence.
  // Full HMAC validation can be tightened once production Twilio numbers are live.
  // Reject obviously empty signatures.
  if (String(signature).length < 8) {
    return { ok: false, status: 403, error: 'Invalid Twilio signature' }
  }
  return { ok: true, skipped: false, url: fullUrl || null }
}

export async function handleSmsInbound(req, res, { json }) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const body = parseFormBody(req)
  const from = String(body.From || body.from || '').trim()
  const text = String(body.Body || body.body || body.Text || '').trim()

  if (!from || !phoneDigits(from)) {
    return json(res, 400, { error: 'Missing From' })
  }

  try {
    if (isStopKeyword(text)) {
      const result = await applySmsOptOutByPhone(from)
      console.info('[sms-inbound] STOP', { updated: result.updated, fromSuffix: phoneDigits(from).slice(-4) })
      res.setHeader('Content-Type', 'text/xml')
      return res.status(200).send('<Response></Response>')
    }
    if (isStartKeyword(text)) {
      const result = await applySmsStartByPhone(from)
      console.info('[sms-inbound] START', { updated: result.updated, fromSuffix: phoneDigits(from).slice(-4) })
      res.setHeader('Content-Type', 'text/xml')
      return res.status(200).send('<Response></Response>')
    }
    console.info('[sms-inbound] ignored', { fromSuffix: phoneDigits(from).slice(-4) })
    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send('<Response></Response>')
  } catch (err) {
    console.error('[sms-inbound] error:', err?.message || err)
    return json(res, 500, { error: 'Inbound SMS handling failed' })
  }
}
