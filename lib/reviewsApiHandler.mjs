import { json, requireAdmin } from './adminAuth.mjs'
import { notifyPendingWebsiteReview } from './reviewNotify.mjs'
import {
  checkReviewIngestRateLimit,
  createReviewFromIngest,
  deleteReview,
  getReview,
  isReviewsStorageConfigured,
  listPublishedWebsiteReviews,
  listReviews,
  normalizeReviewId,
  toAdminReviewListItem,
  updateReview,
  validateReviewAdminUpdate,
  validateReviewIngest,
} from './reviewsStore.mjs'

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
 * Website customer reviews handler (folded into /api/leads for Hobby function limits).
 * Invoked when resource=website-reviews (via /api/reviews rewrite).
 */
export async function handleWebsiteReviewsRequest(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (!isReviewsStorageConfigured()) {
    return json(res, 503, {
      error: 'Reviews storage not configured',
      hint: 'Connect Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)',
    })
  }

  const isPublicList = req.method === 'GET' && String(req.query?.public || '') === '1'

  if (isPublicList) {
    try {
      const reviews = await listPublishedWebsiteReviews({ limit: 24 })
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
      return json(res, 200, { reviews, source: 'website', count: reviews.length })
    } catch (err) {
      console.error('[reviews] public list error:', err?.message || err)
      return json(res, 500, { error: 'Unable to load reviews' })
    }
  }

  if (req.method === 'POST') {
    const ip = getClientIp(req)
    try {
      const rate = await checkReviewIngestRateLimit(ip)
      if (!rate.allowed) {
        console.info('[reviews] rate limited')
        return json(res, 429, { error: 'Too many requests. Please try again later.' })
      }
    } catch (err) {
      console.error('[reviews] rate limit error:', err?.message || err)
    }

    const body = parseBody(req)
    const validated = validateReviewIngest(body)

    if (!validated.ok) {
      if (validated.status === 204) {
        console.info('[reviews] honeypot rejected')
        return json(res, 200, { ok: true })
      }
      return json(res, validated.status || 400, { error: validated.error || 'Invalid review' })
    }

    try {
      const created = await createReviewFromIngest(validated.data)
      console.info('[reviews] created', { id: created.id, duplicate: Boolean(created.duplicate) })

      if (!created.duplicate) {
        notifyPendingWebsiteReview({
          id: created.id,
          name: validated.data.name,
          createdAt: created.createdAt,
        }).catch(() => {})
      }

      return json(res, 201, { ok: true, id: created.id })
    } catch (err) {
      console.error('[reviews] storage error:', err?.message || err)
      const status = err?.status || 500
      return json(res, status, { error: 'Unable to save review' })
    }
  }

  const auth = requireAdmin(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  const itemId = normalizeReviewId(req.query?.id)

  try {
    if (req.method === 'GET') {
      if (itemId) {
        const review = await getReview(itemId)
        if (!review) return json(res, 404, { error: 'Review not found' })
        return json(res, 200, { review })
      }

      const reviews = await listReviews({
        status: req.query?.status,
        q: req.query?.q,
        published: req.query?.published,
      })

      return json(res, 200, {
        reviews: reviews.map((r) => toAdminReviewListItem(r)),
        count: reviews.length,
      })
    }

    if (req.method === 'PATCH') {
      if (!itemId) return json(res, 400, { error: 'Missing review id' })
      const body = parseBody(req)
      const validated = validateReviewAdminUpdate(body)
      if (!validated.ok) {
        return json(res, validated.status || 400, { error: validated.error })
      }
      const review = await updateReview(itemId, validated.data)
      console.info('[reviews] updated', { id: review.id, status: review.status, published: review.published })
      return json(res, 200, { review })
    }

    if (req.method === 'DELETE') {
      if (!itemId) return json(res, 400, { error: 'Missing review id' })
      const result = await deleteReview(itemId)
      console.info('[reviews] deleted', { id: result.id })
      return json(res, 200, result)
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    return json(res, 405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('[reviews]', err?.message || err)
    const status = err?.status || 500
    return json(res, status, { error: err?.message || 'Reviews request failed' })
  }
}
