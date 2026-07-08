import { addEvent, nowIso, safeId } from '../lib/analyticsStore.mjs'

const ALLOWED_EVENTS = new Set([
  'page_view',
  'instant_quote_started',
  'instant_quote_completed',
  'booking_requested',
  'contact_form_submitted',
  'phone_clicked',
  'call_now_clicked',
  'text_clicked',
  'book_online_clicked',
  'google_review_clicked',
])

function json(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.status(status).json(payload)
}

function getClientIp(req) {
  const xfwd = req.headers['x-forwarded-for']
  if (typeof xfwd === 'string' && xfwd.trim()) return xfwd.split(',')[0].trim()
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  /** @type {any} */
  const body = req.body ?? {}
  const type = String(body.type || '').trim()

  if (!ALLOWED_EVENTS.has(type)) {
    return json(res, 400, { error: 'Invalid event type' })
  }

  const event = {
    id: safeId('evt'),
    type,
    ts: Date.now(),
    at: nowIso(),
    visitorId: typeof body.visitorId === 'string' ? body.visitorId.slice(0, 100) : null,
    sessionId: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 100) : null,
    path: typeof body.path === 'string' ? body.path.slice(0, 300) : null,
    pageTitle: typeof body.pageTitle === 'string' ? body.pageTitle.slice(0, 160) : null,
    referrer: typeof body.referrer === 'string' ? body.referrer.slice(0, 500) : null,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 400) : null,
    ip: getClientIp(req),
    utmSource: typeof body.utmSource === 'string' ? body.utmSource.slice(0, 100) : null,
    utmMedium: typeof body.utmMedium === 'string' ? body.utmMedium.slice(0, 100) : null,
    utmCampaign: typeof body.utmCampaign === 'string' ? body.utmCampaign.slice(0, 160) : null,
    utmTerm: typeof body.utmTerm === 'string' ? body.utmTerm.slice(0, 160) : null,
    utmContent: typeof body.utmContent === 'string' ? body.utmContent.slice(0, 160) : null,
    sourceHint: typeof body.sourceHint === 'string' ? body.sourceHint.slice(0, 100) : null,

    // business fields
    service: typeof body.service === 'string' ? body.service.slice(0, 120) : null,
    city: typeof body.city === 'string' ? body.city.slice(0, 120) : null,
    quoteValueLow: Number.isFinite(Number(body.quoteValueLow)) ? Number(body.quoteValueLow) : null,
    quoteValueHigh: Number.isFinite(Number(body.quoteValueHigh)) ? Number(body.quoteValueHigh) : null,
  }

  try {
    await addEvent(event)
  } catch (err) {
    console.error('[track-event] storage error:', err?.message || err)
    res.setHeader('Cache-Control', 'no-store')
    return json(res, 503, {
      error: 'Analytics storage not configured',
      hint: 'Connect Upstash Redis (Vercel Storage) and set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN',
    })
  }

  if (body?.debug === true) {
    const tail = (event.visitorId || '').slice(-6)
    console.info('[track-event debug]', { type: event.type, path: event.path, visitor: tail || null })
  }

  res.setHeader('Cache-Control', 'no-store')
  return json(res, 200, { ok: true, persisted: true })
}

