/**
 * Twilio inbound SMS webhook helpers (STOP/START/HELP + freeform replies).
 * Folded into /api/leads?resource=sms-inbound to stay within Hobby function limits.
 *
 * Production requests must pass Twilio signature validation.
 */
import {
  appendOutboundSmsToLead,
  appendSmsToLeadsByPhone,
  applySmsOptOutByPhone,
  applySmsStartByPhone,
  phoneDigits,
  updateSmsStatusBySid,
} from './leadsStore.mjs'
import { buildHelpReplyMessage, isSmsSendingEnabled } from './smsConfig.mjs'
import { isHelpKeyword, isStartKeyword, isStopKeyword } from './smsKeywords.mjs'
import { verifyTwilioWebhookSignature } from './smsTwilioAuth.mjs'

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

function twimlEmpty(res) {
  res.setHeader('Content-Type', 'text/xml')
  return res.status(200).send('<Response></Response>')
}

function twimlMessage(res, body) {
  const safe = String(body || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  res.setHeader('Content-Type', 'text/xml')
  return res.status(200).send(`<Response><Message>${safe}</Message></Response>`)
}

function keywordFromBody(text) {
  return String(text || '').trim().toUpperCase().slice(0, 40) || null
}

export async function handleSmsInbound(req, res, { json }) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const body = parseFormBody(req)
  const auth = verifyTwilioWebhookSignature(req, body, {
    path: '/api/sms/inbound',
    envKey: 'TWILIO_INBOUND_WEBHOOK_URL',
  })
  if (!auth.ok) {
    console.error('[sms-inbound] signature rejected', { reason: auth.reason || null })
    return json(res, auth.status || 403, { error: auth.error || 'Forbidden' })
  }

  const from = String(body.From || body.from || '').trim()
  const text = String(body.Body || body.body || body.Text || '').trim()
  const sid = String(body.MessageSid || body.SmsSid || body.SmsMessageSid || '').trim() || null

  if (!from || !phoneDigits(from)) {
    return json(res, 400, { error: 'Missing From' })
  }

  const at = new Date().toISOString()
  const keyword = keywordFromBody(text)

  try {
    // Always persist the inbound message on matching leads.
    const stored = await appendSmsToLeadsByPhone(from, {
      direction: 'inbound',
      body: text,
      at,
      kind: isStopKeyword(text)
        ? 'opt_out'
        : isStartKeyword(text)
          ? 'resubscribe'
          : isHelpKeyword(text)
            ? 'help'
            : 'customer_reply',
      sid,
      status: 'received',
    })

    if (isStopKeyword(text)) {
      const result = await applySmsOptOutByPhone(from, { at, keyword })
      console.info('[sms-inbound] STOP', {
        updated: result.updated,
        threadLeads: stored.updated,
        fromSuffix: phoneDigits(from).slice(-4),
      })
      return twimlEmpty(res)
    }

    if (isStartKeyword(text)) {
      const result = await applySmsStartByPhone(from, { at, keyword })
      console.info('[sms-inbound] START', {
        updated: result.updated,
        threadLeads: stored.updated,
        fromSuffix: phoneDigits(from).slice(-4),
      })
      return twimlEmpty(res)
    }

    if (isHelpKeyword(text)) {
      const helpBody = buildHelpReplyMessage()
      if (isSmsSendingEnabled()) {
        // Twilio will deliver the TwiML Message; also record outbound on matched leads.
        for (const leadId of stored.leadIds || []) {
          try {
            await appendOutboundSmsToLead(leadId, {
              body: helpBody,
              at,
              kind: 'help_reply',
              status: 'queued',
            })
          } catch (err) {
            console.error('[sms-inbound] help transcript failed', {
              leadId,
              error: err?.message || err,
            })
          }
        }
        console.info('[sms-inbound] HELP', {
          threadLeads: stored.updated,
          fromSuffix: phoneDigits(from).slice(-4),
          reply: 'twiml',
        })
        return twimlMessage(res, helpBody)
      }

      console.info('[sms-inbound] HELP suppressed (SMS disabled)', {
        threadLeads: stored.updated,
        fromSuffix: phoneDigits(from).slice(-4),
      })
      return twimlEmpty(res)
    }

    console.info('[sms-inbound] reply stored', {
      threadLeads: stored.updated,
      fromSuffix: phoneDigits(from).slice(-4),
    })
    return twimlEmpty(res)
  } catch (err) {
    console.error('[sms-inbound] error:', err?.message || err)
    return json(res, 500, { error: 'Inbound SMS handling failed' })
  }
}

export async function handleSmsStatusCallback(req, res, { json }) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const body = parseFormBody(req)
  const auth = verifyTwilioWebhookSignature(req, body, {
    path: '/api/sms/status',
    envKey: 'TWILIO_STATUS_CALLBACK_URL',
  })
  if (!auth.ok) {
    console.error('[sms-status] signature rejected', { reason: auth.reason || null })
    return json(res, auth.status || 403, { error: auth.error || 'Forbidden' })
  }

  const sid = String(body.MessageSid || body.SmsSid || '').trim()
  const status = String(body.MessageStatus || body.SmsStatus || body.Status || '').trim()
  if (!sid) return json(res, 400, { error: 'Missing MessageSid' })

  try {
    const result = await updateSmsStatusBySid(sid, status)
    console.info('[sms-status]', { updated: result.updated, status: status || null, sidSuffix: sid.slice(-6) })
    return json(res, 200, { ok: true, updated: result.updated })
  } catch (err) {
    console.error('[sms-status] error:', err?.message || err)
    return json(res, 500, { error: 'Status callback failed' })
  }
}
