import { json, requireAdmin } from '../lib/adminAuth.mjs'
import { handleWebsiteReviewsRequest } from '../lib/reviewsApiHandler.mjs'
import { handleSmsInbound, handleSmsStatusCallback } from '../lib/smsInbound.mjs'
import { runLeadUpdateSmsAutomations, runNewLeadSmsAutomations } from '../lib/smsAutomations.mjs'
import {
  checkLeadIngestRateLimit,
  createLeadFromIngest,
  getLead,
  isLeadsStorageConfigured,
  listLeadsWithSummary,
  normalizeLeadId,
  presentLead,
  toLeadListItem,
  updateLead,
  validateLeadIngest,
} from '../lib/leadsStore.mjs'

function safeSms(label, promise) {
  Promise.resolve(promise)
    .then((result) => {
      console.info(`[sms] ${label}`, {
        ok: result?.ok !== false,
        results: Array.isArray(result?.results)
          ? result.results.map((r) => ({
              kind: r.kind,
              ok: r.ok,
              skipped: r.skipped || false,
              dryRun: r.dryRun || false,
              reason: r.reason || null,
            }))
          : undefined,
      })
    })
    .catch((err) => {
      console.error(`[sms] ${label} failed:`, err?.message || err)
    })
}

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
 * - POST /api/leads  → create lead or link booking onto existing Instant Quote lead
 *   Response: { ok, id } (no PII). Optional linkedLeadId for quote→booking continuity.
 *
 * Website customer reviews (same function via rewrite /api/reviews → ?resource=website-reviews):
 * - POST/GET/PATCH/DELETE handled by handleWebsiteReviewsRequest
 *
 * Admin (cookie auth):
 * - GET  /api/leads
 * - GET  /api/leads?id=<leadId>
 * - PATCH /api/leads?id=<leadId>
 *   body: {
 *     status?, note?, followUpDate?, followUpNote?, clearFollowUp?,
 *     appointmentDate?, appointmentStartTime?, appointmentTimezone?,
 *     appointmentStatus?, appointmentNotes?,
 *     quotedAmount?, bookedAmount?, completedRevenue?, paymentStatus?,
 *     internalNotes?
 *   }
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  // Folded website reviews keep us under Vercel Hobby serverless-function limits.
  if (String(req.query?.resource || '') === 'website-reviews') {
    return handleWebsiteReviewsRequest(req, res)
  }

  // Twilio STOP/START/HELP webhook (rewrite /api/sms/inbound → this resource).
  if (String(req.query?.resource || '') === 'sms-inbound') {
    if (!isLeadsStorageConfigured()) {
      return json(res, 503, { error: 'Leads storage not configured' })
    }
    return handleSmsInbound(req, res, { json })
  }

  // Twilio delivery status callback (rewrite /api/sms/status → this resource).
  if (String(req.query?.resource || '') === 'sms-status') {
    if (!isLeadsStorageConfigured()) {
      return json(res, 503, { error: 'Leads storage not configured' })
    }
    return handleSmsStatusCallback(req, res, { json })
  }

  if (!isLeadsStorageConfigured()) {
    return json(res, 503, {
      error: 'Leads storage not configured',
      hint: 'Connect Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)',
    })
  }

  // ——— Public create / link ———
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
      console.info('[leads] created', {
        id: created.id,
        source: validated.data.source,
        linked: Boolean(created.linked),
        smsConsent: validated.data.smsConsent === true,
      })
      // SMS must never block or fail the lead save. Instant Quote only for new-lead texts.
      if (!created.linked && validated.data.source === 'instant_quote') {
        safeSms('new-lead', runNewLeadSmsAutomations(created.id))
      }
      return json(res, 201, { ok: true, id: created.id, linked: Boolean(created.linked) })
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
        return json(res, 200, { lead: presentLead(lead) })
      }

      const { leads, followUpSummary } = await listLeadsWithSummary({
        status: req.query?.status,
        source: req.query?.source,
        q: req.query?.q,
        service: req.query?.service,
        city: req.query?.city,
        followUp: req.query?.followUp,
        // active | completed | all — Completed/Lost remain in Redis; Active only hides them from this response slice
        inboxView: req.query?.inboxView || req.query?.view,
      })

      return json(res, 200, {
        leads: leads.map((lead) => toLeadListItem(lead)),
        count: leads.length,
        followUpSummary,
        inboxView: req.query?.inboxView || req.query?.view || null,
      })
    }

    if (req.method === 'PATCH') {
      if (!itemId) return json(res, 400, { error: 'Missing lead id' })
      const body = parseBody(req)
      const before = await getLead(itemId)
      // Pass through only defined keys — updateLead ignores unspecified fields.
      const lead = await updateLead(itemId, body)
      console.info('[leads] updated', { id: lead.id, status: lead.status })
      // Booking confirm / reschedule / review scheduling — never blocks the admin save.
      safeSms('lead-update', runLeadUpdateSmsAutomations(before ? presentLead(before) : null, lead))
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
