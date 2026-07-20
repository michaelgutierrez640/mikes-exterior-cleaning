import { getAnalyticsRedis, isAnalyticsStorageConfigured } from './analyticsRedis.mjs'
import {
  buildFallbackGoogleReviewsResponse,
  FALLBACK_BUSINESS_NAME,
} from './googleReviewsData.mjs'

export const REVIEWS_SNAPSHOT_KEY = 'reviews:public:snapshot'
export const DISPLAY_REVIEW_LIMIT = 12

export function isReviewsStorageConfigured() {
  return isAnalyticsStorageConfigured()
}

/**
 * Public-safe snapshot shape stored in Redis and returned by GET /api/google-reviews.
 * Never includes OAuth secrets, account/location IDs, or owner replies.
 */
export function toPublicReviewsPayload(snapshot, { cached = false } = {}) {
  if (!snapshot || !Array.isArray(snapshot.reviews)) {
    return null
  }

  const reviews = [...snapshot.reviews]
    .sort((a, b) => {
      const aTime = Date.parse(a.updatedAt || a.createTime || a.date) || 0
      const bTime = Date.parse(b.updatedAt || b.createTime || b.date) || 0
      return bTime - aTime
    })
    .slice(0, DISPLAY_REVIEW_LIMIT)
    .map((r) => ({
      id: r.id || null,
      reviewerName: r.reviewerName,
      rating: r.rating,
      reviewText: r.reviewText,
      date: r.date,
      updatedAt: r.updatedAt || null,
      reviewUrl: r.reviewUrl || null,
      source: 'Google',
    }))

  return {
    source: snapshot.source || 'redis',
    businessName: snapshot.businessName || FALLBACK_BUSINESS_NAME,
    rating: snapshot.rating ?? null,
    reviewCount: snapshot.reviewCount ?? null,
    reviewsUrl: snapshot.reviewsUrl || null,
    reviews,
    fetchedAt: snapshot.syncedAt || snapshot.fetchedAt || null,
    syncedAt: snapshot.syncedAt || null,
    cached,
  }
}

export async function getReviewsSnapshot() {
  const redis = getAnalyticsRedis()
  if (!redis) return null

  const raw = await redis.get(REVIEWS_SNAPSHOT_KEY)
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Replace the entire public snapshot (full sync).
 * @param {object} snapshot
 */
export async function saveReviewsSnapshot(snapshot) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    const err = new Error('Reviews storage not configured')
    err.status = 503
    throw err
  }

  await redis.set(REVIEWS_SNAPSHOT_KEY, JSON.stringify(snapshot))
  return snapshot
}

/**
 * Build GET response: Redis snapshot first, then hard-coded fallback.
 */
export async function getPublicReviewsResponse() {
  try {
    const snapshot = await getReviewsSnapshot()
    const publicPayload = toPublicReviewsPayload(snapshot, { cached: true })
    // Prefer any successfully synced Redis snapshot (last good cache), even if temporarily empty
    if (publicPayload && (snapshot?.syncedAt || publicPayload.reviews.length > 0)) {
      return publicPayload
    }
  } catch (err) {
    console.error('[reviewsStore] read failed:', err?.message || err)
  }

  return { ...buildFallbackGoogleReviewsResponse('redis-empty'), cached: false }
}
