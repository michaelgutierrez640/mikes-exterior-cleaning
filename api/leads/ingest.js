import { json } from '../../lib/adminAuth.mjs'
import {
  checkLeadIngestRateLimit,
  createLeadFromIngest,
  isLeadsStorageConfigured,
  validateLeadIngest,
} from '../../lib/leadsStore.mjs'

function getClientIp(req) {
  const xfwd = req.headers['x-forwarded-for']
  if (typeof xfwd === 'string' && xfwd.trim()) return xfwd.split(',')[0].trim().slice(0, 80)
  return null
}

function parseBody(req) {
  const raw = req.body
  if (raw !== undefined && raw !== null && raw !== '') {
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw)
      } catch {
        return {}
      }
    }
    if (typeof raw === 'object') return raw
  }
  return {}
}

/**
 * Public lead create only.
 * POST /api/leads/ingest
 * Never returns stored customer fields.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  if (!isLeadsStorageConfigured()) {
    return json(res, 503, { error: 'Leads storage not configured' })
  }

  const ip = getClientIp(req)
  try {
    const rate = await checkLeadIngestRateLimit(ip)
    if (!rate.allowed) {
      console.info('[leads/ingest] rate limited')
      return json(res, 429, { error: 'Too many requests. Please try again later.' })
    }
  } catch (err) {
    console.error('[leads/ingest] rate limit error:', err?.message || err)
  }

  const body = parseBody(req)
  const validated = validateLeadIngest(body)

  if (!validated.ok) {
    // Honeypot: pretend success so bots learn nothing
    if (validated.status === 204) {
      console.info('[leads/ingest] honeypot rejected')
      return json(res, 200, { ok: true })
    }
    return json(res, validated.status || 400, { error: validated.error || 'Invalid lead' })
  }

  try {
    const created = await createLeadFromIngest(validated.data)
    console.info('[leads/ingest] created', { id: created.id, source: validated.data.source })
    // Intentionally omit all customer fields from the response
    return json(res, 201, { ok: true, id: created.id })
  } catch (err) {
    console.error('[leads/ingest] storage error:', err?.message || err)
    const status = err?.status || 500
    return json(res, status, { error: 'Unable to save lead' })
  }
}
