import { json, requireAdmin } from '../../lib/adminAuth.mjs'
import {
  getLead,
  isLeadsStorageConfigured,
  listLeads,
  normalizeLeadId,
  toLeadListItem,
  updateLead,
} from '../../lib/leadsStore.mjs'

/**
 * Admin leads API (cookie auth required).
 * - GET  /api/admin/leads
 * - GET  /api/admin/leads?id=<leadId>
 * - PATCH /api/admin/leads?id=<leadId>  body: { status?, note? }
 *
 * Query-param item routes avoid brittle dynamic /api/.../[id] matching behind the SPA rewrite.
 */
export default async function handler(req, res) {
  const auth = requireAdmin(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  if (!isLeadsStorageConfigured()) {
    return json(res, 503, {
      error: 'Leads storage not configured',
      hint: 'Connect Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)',
    })
  }

  const itemId = normalizeLeadId(req.query?.id)

  try {
    if (req.method === 'GET') {
      if (itemId) {
        const lead = await getLead(itemId)
        if (!lead) return json(res, 404, { error: 'Lead not found' })
        return json(res, 200, { lead })
      }

      const leads = await listLeads({
        status: req.query?.status,
        source: req.query?.source,
        q: req.query?.q,
        service: req.query?.service,
        city: req.query?.city,
      })

      return json(res, 200, {
        leads: leads.map(toLeadListItem),
        count: leads.length,
      })
    }

    if (req.method === 'PATCH') {
      if (!itemId) return json(res, 400, { error: 'Missing lead id' })
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const lead = await updateLead(itemId, {
        status: body.status,
        note: body.note,
      })
      console.info('[admin/leads] updated', { id: lead.id, status: lead.status })
      return json(res, 200, { lead })
    }

    res.setHeader('Allow', 'GET, PATCH')
    return json(res, 405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('[admin/leads]', err?.message || err)
    const status = err?.status || 500
    return json(res, status, { error: err?.message || 'Leads request failed' })
  }
}
