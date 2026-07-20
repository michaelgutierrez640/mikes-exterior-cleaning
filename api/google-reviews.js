import { requireAdmin, json as adminJson } from '../lib/adminAuth.mjs'
import { buildGbpReviewsSnapshot, isGbpConfigured } from '../lib/googleGbpClient.mjs'
import {
  getPublicReviewsResponse,
  isReviewsStorageConfigured,
  saveReviewsSnapshot,
} from '../lib/reviewsStore.mjs'

const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
  'Content-Type': 'application/json; charset=utf-8',
}

function sendPublicJson(res, status, payload) {
  res.setHeader('Cache-Control', PUBLIC_CACHE_HEADERS['Cache-Control'])
  res.setHeader('Content-Type', PUBLIC_CACHE_HEADERS['Content-Type'])
  res.status(status).json(payload)
}

function getSyncSecret() {
  return process.env.REVIEWS_SYNC_SECRET?.trim() || ''
}

/**
 * Authorize cron / automated sync via shared secret.
 * Vercel Cron sends Authorization: Bearer <CRON_SECRET> when CRON_SECRET is set —
 * document setting CRON_SECRET === REVIEWS_SYNC_SECRET on Hobby.
 */
function isSyncSecretAuthorized(req) {
  const secret = getSyncSecret()
  if (!secret) return false

  const auth = String(req.headers?.authorization || '')
  if (auth === `Bearer ${secret}`) return true

  const header = req.headers?.['x-reviews-sync-secret']
  if (typeof header === 'string' && header === secret) return true

  return false
}

function canTriggerSync(req) {
  if (isSyncSecretAuthorized(req)) return { ok: true, via: 'secret' }
  const admin = requireAdmin(req)
  if (admin.ok) return { ok: true, via: 'admin' }
  return { ok: false, status: admin.status === 503 ? 503 : 401, error: admin.error || 'Unauthorized' }
}

async function runSync() {
  if (!isGbpConfigured()) {
    const err = new Error('Google Business Profile credentials are not configured')
    err.status = 503
    throw err
  }
  if (!isReviewsStorageConfigured()) {
    const err = new Error('Reviews storage not configured')
    err.status = 503
    throw err
  }

  const snapshot = await buildGbpReviewsSnapshot()
  await saveReviewsSnapshot(snapshot)

  return {
    ok: true,
    source: 'google-business-profile',
    reviewCount: snapshot.reviewCount,
    storedReviews: snapshot.reviews.length,
    rating: snapshot.rating,
    syncedAt: snapshot.syncedAt,
  }
}

/**
 * GET  /api/google-reviews
 *   - Public: Redis snapshot (newest first) or hard-coded fallback
 *   - With sync secret (Vercel Cron): sync first, then return public payload
 *
 * POST /api/google-reviews
 *   - Sync: requires REVIEWS_SYNC_SECRET Bearer/header OR admin cookie
 *   - Returns sync summary only (no credentials, no raw Google payload)
 */
export default async function handler(req, res) {
  // ——— Sync triggers ———
  if (req.method === 'POST') {
    const auth = canTriggerSync(req)
    if (!auth.ok) return adminJson(res, auth.status, { error: auth.error })

    try {
      const result = await runSync()
      console.info('[google-reviews] sync ok', {
        via: auth.via,
        storedReviews: result.storedReviews,
        reviewCount: result.reviewCount,
      })
      return adminJson(res, 200, result)
    } catch (err) {
      console.error('[google-reviews] sync failed:', err?.message || err)
      const status = err?.status || 500
      return adminJson(res, status, { error: err?.message || 'Sync failed' })
    }
  }

  if (req.method === 'GET') {
    // Vercel Cron invokes GET — optional authorized sync-then-serve
    if (isSyncSecretAuthorized(req)) {
      try {
        const result = await runSync()
        console.info('[google-reviews] cron sync ok', {
          storedReviews: result.storedReviews,
          reviewCount: result.reviewCount,
        })
      } catch (err) {
        console.error('[google-reviews] cron sync failed:', err?.message || err)
        // Fall through to serve last good Redis / fallback
      }
    }

    try {
      const payload = await getPublicReviewsResponse()
      return sendPublicJson(res, 200, payload)
    } catch (err) {
      console.error('[google-reviews] public read failed:', err?.message || err)
      const { buildFallbackGoogleReviewsResponse } = await import('../lib/googleReviewsData.mjs')
      return sendPublicJson(res, 200, {
        ...buildFallbackGoogleReviewsResponse('api-error'),
        cached: false,
      })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return sendPublicJson(res, 405, { error: 'Method not allowed' })
}
