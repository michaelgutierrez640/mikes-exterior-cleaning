/**
 * Google Business Profile Reviews API client (server-side only).
 * Uses OAuth refresh token — never log credentials or raw review payloads with owner replies.
 */

import { FALLBACK_BUSINESS_NAME } from './googleReviewsData.mjs'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const STAR_MAP = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
}

function trimEnv(name) {
  return process.env[name]?.trim() || ''
}

export function getGbpConfig() {
  return {
    clientId: trimEnv('GOOGLE_GBP_CLIENT_ID'),
    clientSecret: trimEnv('GOOGLE_GBP_CLIENT_SECRET'),
    refreshToken: trimEnv('GOOGLE_GBP_REFRESH_TOKEN'),
    accountId: trimEnv('GOOGLE_GBP_ACCOUNT_ID'),
    locationId: trimEnv('GOOGLE_GBP_LOCATION_ID'),
  }
}

export function isGbpConfigured() {
  const c = getGbpConfig()
  return Boolean(c.clientId && c.clientSecret && c.refreshToken && c.accountId && c.locationId)
}

/** Accept bare IDs or full resource path segments. */
export function normalizeResourceId(value, kind) {
  let id = String(value || '').trim()
  if (!id) return ''
  if (kind === 'account') {
    id = id.replace(/^accounts\//i, '')
  }
  if (kind === 'location') {
    // accounts/123/locations/456 → 456
    const locMatch = id.match(/locations\/([^/]+)/i)
    if (locMatch) id = locMatch[1]
    id = id.replace(/^locations\//i, '')
  }
  return id
}

function formatDisplayDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function stripTranslatedSuffix(text) {
  // GBP sometimes appends translation markers; keep original readable text
  return String(text || '')
    .replace(/\n*\(Translated by Google\)\s*$/i, '')
    .replace(/\n*\(Original\)\s*/i, '\n')
    .trim()
}

/**
 * @returns {Promise<string>} access token
 */
export async function fetchGbpAccessToken() {
  const { clientId, clientSecret, refreshToken } = getGbpConfig()
  if (!clientId || !clientSecret || !refreshToken) {
    const err = new Error('GBP OAuth is not configured')
    err.status = 503
    throw err
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })

  if (!res.ok) {
    console.error('[gbp] token refresh failed', { status: res.status })
    const err = new Error('Unable to refresh Google access token')
    err.status = 502
    throw err
  }

  const data = await res.json()
  if (!data.access_token) {
    const err = new Error('Google token response missing access_token')
    err.status = 502
    throw err
  }
  return data.access_token
}

/**
 * Normalize one GBP review to public-safe fields only (no reviewReply).
 */
export function normalizeGbpReview(raw, { reviewsUrl = null } = {}) {
  if (!raw || typeof raw !== 'object') return null

  const id = String(raw.reviewId || raw.name || '').trim().slice(0, 200)
  const reviewerName = raw.reviewer?.isAnonymous
    ? 'Google User'
    : String(raw.reviewer?.displayName || 'Google User').trim().slice(0, 120) || 'Google User'
  const rating = STAR_MAP[raw.starRating] || Number(raw.starRating) || 0
  const reviewText = stripTranslatedSuffix(raw.comment || '').slice(0, 8000)
  const createTime = raw.createTime ? String(raw.createTime) : null
  const updateTime = raw.updateTime ? String(raw.updateTime) : null

  if (!id && !reviewText) return null
  if (!rating || rating < 1) return null

  return {
    id: id || `${reviewerName}-${createTime || reviewText.slice(0, 24)}`,
    reviewerName,
    rating,
    reviewText,
    date: formatDisplayDate(createTime || updateTime),
    createTime,
    updatedAt: updateTime,
    reviewUrl: reviewsUrl || null,
    source: 'Google',
  }
}

/**
 * Fetch all reviews for the configured location (paginated).
 * @returns {Promise<{ reviews: object[], averageRating: number|null, totalReviewCount: number|null }>}
 */
export async function fetchAllGbpReviews() {
  const cfg = getGbpConfig()
  const accountId = normalizeResourceId(cfg.accountId, 'account')
  const locationId = normalizeResourceId(cfg.locationId, 'location')
  if (!accountId || !locationId) {
    const err = new Error('GBP account or location ID is invalid')
    err.status = 503
    throw err
  }

  const accessToken = await fetchGbpAccessToken()
  const reviews = []
  let averageRating = null
  let totalReviewCount = null
  let pageToken = ''

  do {
    const url = new URL(
      `https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/reviews`,
    )
    url.searchParams.set('pageSize', '50')
    url.searchParams.set('orderBy', 'updateTime desc')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      console.error('[gbp] reviews.list failed', { status: res.status })
      const err = new Error('Google Business Profile reviews request failed')
      err.status = 502
      throw err
    }

    const data = await res.json()
    if (typeof data.averageRating === 'number') averageRating = data.averageRating
    if (typeof data.totalReviewCount === 'number') totalReviewCount = data.totalReviewCount

    for (const item of data.reviews || []) {
      reviews.push(item)
    }

    pageToken = data.nextPageToken || ''
  } while (pageToken)

  return { reviews, averageRating, totalReviewCount }
}

/**
 * Full sync: pull GBP reviews, normalize, return snapshot object (not yet saved).
 */
export async function buildGbpReviewsSnapshot() {
  const reviewsUrl =
    process.env.VITE_GOOGLE_REVIEWS_URL?.trim() ||
    process.env.GOOGLE_REVIEWS_PUBLIC_URL?.trim() ||
    null

  const { reviews: rawReviews, averageRating, totalReviewCount } = await fetchAllGbpReviews()

  const normalized = []
  const seen = new Set()
  for (const raw of rawReviews) {
    const review = normalizeGbpReview(raw, { reviewsUrl })
    if (!review) continue
    if (!review.reviewText) continue
    if (seen.has(review.id)) continue
    seen.add(review.id)
    normalized.push(review)
  }

  normalized.sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || a.createTime || 0) || 0
    const bTime = Date.parse(b.updatedAt || b.createTime || 0) || 0
    return bTime - aTime
  })

  const syncedAt = new Date().toISOString()

  return {
    source: 'google-business-profile',
    businessName: FALLBACK_BUSINESS_NAME,
    rating: averageRating != null ? Number(averageRating) : null,
    reviewCount: totalReviewCount != null ? Number(totalReviewCount) : normalized.length,
    reviewsUrl,
    reviews: normalized,
    syncedAt,
    fetchedAt: syncedAt,
  }
}
