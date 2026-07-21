import { json, requireAdmin } from '../lib/adminAuth.mjs'
import {
  checkLeadIngestRateLimit,
  createLeadFromIngest,
  getLead,
  isLeadsStorageConfigured,
  listLeadsWithSummary,
  normalizeLeadId,
  toLeadListItem,
  updateLead,
  validateLeadIngest,
} from '../lib/leadsStore.mjs'

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
 * Combined leads API (Hobby plan: one serverless function).
 *
 * Public:
 * - POST /api/leads  → create lead (no PII in response)
 *
 * Admin (cookie auth):
 * - GET  /api/leads
 * - GET  /api/leads?id=<leadId>
 * - PATCH /api/leads?id=<leadId>  body: { status?, note?, followUpDate?, followUpNote?, clearFollowUp? }
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (!isLeadsStorageConfigured()) {
    return json(res, 503, {
      error: 'Leads storage not configured',
      hint: 'Connect Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)',
    })
  }

  // ——— Public create ———
  if (req.method === 'POST') {
    const ip = getClientIp(req)
    try {
      const rate = await checkLeadIngestRateLimit(ip)
      if (!rate.allowed) {
        console.info('[leads] rate limited')
        return json(res, 429, { error: 'Too many requests. Please try again later.' })
      }
    } catch (err) {
      console.error('[leads] rate limit error:', err?.message || err)
    }

    const body = parseBody(req)
    const validated = validateLeadIngest(body)

    if (!validated.ok) {
      if (validated.status === 204) {
        console.info('[leads] honeypot rejected')
        return json(res, 200, { ok: true })
      }
      return json(res, validated.status || 400, { error: validated.error || 'Invalid lead' })
    }

    try {
      const created = await createLeadFromIngest(validated.data)
      console.info('[leads] created', { id: created.id, source: validated.data.source })
      return json(res, 201, { ok: true, id: created.id })
    } catch (err) {
      console.error('[leads] storage error:', err?.message || err)
      const status = err?.status || 500
      return json(res, status, { error: 'Unable to save lead' })
    }
  }

  // ——— Admin read / update ———
  const auth = requireAdmin(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  const itemId = normalizeLeadId(req.query?.id)

  try {
    if (req.method === 'GET') {
      if (itemId) {
        const lead = await getLead(itemId)
        if (!lead) return json(res, 404, { error: 'Lead not found' })
        return json(res, 200, { lead })
      }

      const { leads, followUpSummary } = await listLeadsWithSummary({
        status: req.query?.status,
        source: req.query?.source,
        q: req.query?.q,
        service: req.query?.service,
        city: req.query?.city,
        followUp: req.query?.followUp,
      })

      return json(res, 200, {
        leads: leads.map((lead) => toLeadListItem(lead)),
        count: leads.length,
        followUpSummary,
      })
    }

    if (req.method === 'PATCH') {
      if (!itemId) return json(res, 400, { error: 'Missing lead id' })
      const body = parseBody(req)
      const lead = await updateLead(itemId, {
        status: body.status,
        note: body.note,
        followUpDate: body.followUpDate,
        followUpNote: body.followUpNote,
        clearFollowUp: body.clearFollowUp === true,
      })
      console.info('[leads] updated', { id: lead.id, status: lead.status })
      return json(res, 200, { lead })
    }

    res.setHeader('Allow', 'GET, POST, PATCH')
    return json(res, 405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('[leads]', err?.message || err)
    const status = err?.status || 500
    return json(res, status, { error: err?.message || 'Leads request failed' })
  }
}
