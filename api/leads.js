import { handleUpload } from '@vercel/blob/client'
import { get as getBlob } from '@vercel/blob'
import { json, requireAdmin } from '../lib/adminAuth.mjs'

/** Keep Preview/Production lead API under a hard ceiling so clients aren't left waiting forever. */
export const maxDuration = 30
import { handleWebsiteReviewsRequest } from '../lib/reviewsApiHandler.mjs'
import { handleSmsInbound, handleSmsStatusCallback } from '../lib/smsInbound.mjs'
import { runLeadUpdateSmsAutomations, runNewLeadSmsAutomations } from '../lib/smsAutomations.mjs'
import {
  getLeadPhotosBlobToken,
  isLeadPhotoUploadEnabled,
  isSafeLeadPhotoPathname,
  LEAD_PHOTO_CONTENT_TYPES,
  LEAD_PHOTO_PATH_PREFIX,
  MAX_LEAD_PHOTO_BYTES,
} from '../lib/leadPhotos.mjs'
import {
  attachLeadPhotosFromClient,
  checkLeadIngestRateLimit,
  createLeadFromIngest,
  getLead,
  isLeadsStorageConfigured,
  normalizeLeadId,
  permanentlyDeleteLead,
  presentLead,
  restoreLead,
  softDeleteLead,
  toLeadListItem,
  updateLead,
  validateLeadIngest,
  listLeadsWithSummary,
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
 * - POST /api/leads/blob-upload (rewrite) → customer photo upload tokens
 * - POST /api/leads/attach-photos (rewrite) → attach uploaded photos (idempotency-gated)
 *
 * Website customer reviews (same function via rewrite /api/reviews → ?resource=website-reviews):
 * - POST/GET/PATCH/DELETE handled by handleWebsiteReviewsRequest
 *
 * Admin (cookie auth):
 * - GET  /api/leads
 * - GET  /api/leads?id=<leadId>
 * - GET  /api/leads?resource=lead-photo&pathname=lead-photos/...  → private photo stream
 * - PATCH /api/leads?id=<leadId>
 *   body: {
 *     status?, note?, followUpDate?, followUpNote?, clearFollowUp?,
 *     appointmentDate?, appointmentStartTime?, appointmentTimezone?,
 *     appointmentStatus?, appointmentNotes?,
 *     quotedAmount?, bookedAmount?, completedRevenue?, paymentStatus?,
 *     internalNotes?
 *   }
 */
async function handleLeadBlobUpload(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  // Hard gate: never write customer photos into the shared PUBLIC Blob store.
  if (!isLeadPhotoUploadEnabled()) {
    return json(res, 503, {
      error: 'Customer photo uploads are disabled',
      hint:
        'Create a dedicated PRIVATE Vercel Blob store for lead photos, then set LEAD_PHOTOS_ENABLED=true, LEAD_PHOTOS_ACCESS=private, and LEAD_PHOTOS_BLOB_READ_WRITE_TOKEN. The shared public store used for completed-jobs cannot keep customer photos private.',
    })
  }

  const token = getLeadPhotosBlobToken()
  if (!token) {
    return json(res, 503, {
      error: 'Private lead-photo Blob store not configured',
      hint: 'Set LEAD_PHOTOS_BLOB_READ_WRITE_TOKEN from a PRIVATE Blob store',
    })
  }

  const ip = getClientIp(req)
  try {
    // Separate, tighter window for photo uploads (abuse protection).
    const rate = await checkLeadIngestRateLimit(ip, { limit: 20, windowSec: 3600 })
    if (!rate.allowed) {
      return json(res, 429, { error: 'Too many upload requests. Please try again later.' })
    }
  } catch (err) {
    console.error('[leads/blob-upload] rate limit error:', err?.message || err)
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const result = await handleUpload({
      body,
      request: req,
      token,
      onBeforeGenerateToken: async (pathname) => {
        const safePath = String(pathname || '')
          .replace(/[^a-zA-Z0-9._/-]/g, '-')
          .slice(0, 180)
        if (!safePath.startsWith(LEAD_PHOTO_PATH_PREFIX)) {
          throw new Error('Invalid upload path')
        }
        if (safePath.includes('..')) {
          throw new Error('Invalid upload path')
        }
        return {
          allowedContentTypes: LEAD_PHOTO_CONTENT_TYPES,
          maximumSizeInBytes: MAX_LEAD_PHOTO_BYTES,
          addRandomSuffix: true,
          // Omit onUploadCompleted — Preview Deployment Protection (SSO) blocks
          // Vercel Blob's server callback and can leave client upload() hanging.
          tokenPayload: JSON.stringify({ purpose: 'lead-photo', access: 'private' }),
          // Keep token valid long enough for mobile/HEIC uploads on slow networks.
          validUntil: Date.now() + 60 * 60 * 1000,
        }
      },
    })
    return json(res, 200, result)
  } catch (err) {
    console.error('[leads/blob-upload]', err?.message || err)
    const message = err?.message || 'Upload authorization failed'
    return json(res, 400, { error: message })
  }
}

async function handleLeadPhotoProxy(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const auth = requireAdmin(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  // Prefer dedicated private lead-photos token; fall back only for legacy objects.
  const token = getLeadPhotosBlobToken() || process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return json(res, 503, { error: 'Blob storage not configured' })
  }

  const pathname = String(req.query?.pathname || '').trim()
  if (!isSafeLeadPhotoPathname(pathname)) {
    return json(res, 400, { error: 'Invalid photo path' })
  }

  try {
    // Authenticated Admin-only stream. Private stores require access:'private'.
    // Legacy objects on the public store may still be readable with access:'public'.
    let result
    try {
      result = await getBlob(pathname, {
        access: 'private',
        token,
      })
    } catch {
      result = await getBlob(pathname, {
        access: 'public',
        token,
      })
    }
    if (!result?.stream) {
      return json(res, 404, { error: 'Photo not found' })
    }

    const contentType =
      result.blob?.contentType ||
      result.headers?.get?.('content-type') ||
      'application/octet-stream'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    // Node/Vercel: stream may be a Web ReadableStream
    if (typeof result.stream.getReader === 'function' && typeof ReadableStream !== 'undefined') {
      const reader = result.stream.getReader()
      const chunks = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(Buffer.from(value))
      }
      return res.status(200).end(Buffer.concat(chunks))
    }

    // Fallback for Node streams
    if (typeof result.stream.pipe === 'function') {
      res.statusCode = 200
      result.stream.pipe(res)
      return
    }

    return json(res, 500, { error: 'Unable to stream photo' })
  } catch (err) {
    console.error('[leads/lead-photo]', err?.message || err)
    return json(res, 404, { error: 'Photo not found' })
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  const resource = String(req.query?.resource || '').trim()

  // Folded website reviews keep us under Vercel Hobby serverless-function limits.
  if (resource === 'website-reviews') {
    return handleWebsiteReviewsRequest(req, res)
  }

  // Twilio STOP/START/HELP webhook (rewrite /api/sms/inbound → this resource).
  if (resource === 'sms-inbound') {
    if (!isLeadsStorageConfigured()) {
      return json(res, 503, { error: 'Leads storage not configured' })
    }
    return handleSmsInbound(req, res, { json })
  }

  // Twilio delivery status callback (rewrite /api/sms/status → this resource).
  if (resource === 'sms-status') {
    if (!isLeadsStorageConfigured()) {
      return json(res, 503, { error: 'Leads storage not configured' })
    }
    return handleSmsStatusCallback(req, res, { json })
  }

  // Customer photo upload tokens (rewrite /api/leads/blob-upload).
  if (resource === 'blob-upload') {
    return handleLeadBlobUpload(req, res)
  }

  // Admin-only private photo stream for CRM lead detail.
  if (resource === 'lead-photo') {
    return handleLeadPhotoProxy(req, res)
  }

  if (!isLeadsStorageConfigured()) {
    return json(res, 503, {
      error: 'Leads storage not configured',
      hint: 'Connect Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)',
    })
  }

  // ——— Public: attach photos after client Blob upload (idempotency-gated) ———
  if (req.method === 'POST' && resource === 'attach-photos') {
    if (!isLeadPhotoUploadEnabled()) {
      return json(res, 503, {
        error: 'Customer photo uploads are disabled',
        hint: 'Configure a dedicated PRIVATE Blob store before attaching lead photos.',
      })
    }

    const ip = getClientIp(req)
    try {
      const rate = await checkLeadIngestRateLimit(ip, { limit: 30, windowSec: 3600 })
      if (!rate.allowed) {
        return json(res, 429, { error: 'Too many requests. Please try again later.' })
      }
    } catch (err) {
      console.error('[leads/attach-photos] rate limit error:', err?.message || err)
    }

    try {
      const body = parseBody(req)
      const attached = await attachLeadPhotosFromClient(body)
      console.info('[leads] photos attached', {
        id: attached.id,
        photoCount: Array.isArray(attached.photos) ? attached.photos.length : 0,
        photoWarning: Boolean(attached.photoWarning),
      })
      return json(res, 200, {
        ok: true,
        id: attached.id,
        photoCount: Array.isArray(attached.photos) ? attached.photos.length : 0,
        photoWarning: attached.photoWarning || null,
      })
    } catch (err) {
      console.error('[leads/attach-photos]', err?.message || err)
      const status = err?.status || 500
      return json(res, status, { error: err?.message || 'Unable to attach photos' })
    }
  }

  // ——— Public create / link ———
  if (req.method === 'POST' && !resource) {
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
        idempotent: Boolean(created.idempotent),
        smsConsent: validated.data.smsConsent === true,
        problemCount: Array.isArray(validated.data.problems) ? validated.data.problems.length : 0,
      })
      // SMS must never block or fail the lead save. Instant Quote only for new-lead texts.
      if (!created.linked && !created.idempotent && validated.data.source === 'instant_quote') {
        safeSms('new-lead', runNewLeadSmsAutomations(created.id))
      }
      return json(res, 201, {
        ok: true,
        id: created.id,
        linked: Boolean(created.linked),
        idempotent: Boolean(created.idempotent),
      })
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

      // Soft-delete / restore — no SMS or other automations.
      if (body.softDelete === true || body.moveToTrash === true) {
        const lead = await softDeleteLead(itemId, { deletedBy: 'admin' })
        console.info('[leads] moved to trash', { id: lead.id })
        return json(res, 200, { lead })
      }
      if (body.restore === true) {
        const lead = await restoreLead(itemId)
        console.info('[leads] restored from trash', { id: lead.id })
        return json(res, 200, { lead })
      }

      const before = await getLead(itemId)
      // Pass through only defined keys — updateLead ignores unspecified fields.
      const lead = await updateLead(itemId, body)
      console.info('[leads] updated', { id: lead.id, status: lead.status })
      // Never run automations for trashed leads.
      if (!lead.deletedAt) {
        safeSms('lead-update', runLeadUpdateSmsAutomations(before ? presentLead(before) : null, lead))
      }
      return json(res, 200, { lead })
    }

    if (req.method === 'DELETE') {
      if (!itemId) return json(res, 400, { error: 'Missing lead id' })
      const body = parseBody(req)
      if (String(body.confirm || '').trim() !== 'DELETE') {
        return json(res, 400, {
          error: 'Permanent deletion requires confirm: "DELETE"',
        })
      }
      const result = await permanentlyDeleteLead(itemId)
      console.info('[leads] permanently deleted', { id: result.id })
      return json(res, 200, result)
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    return json(res, 405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('[leads]', err?.message || err)
    const status = err?.status || 500
    return json(res, status, { error: err?.message || 'Leads request failed' })
  }
}
