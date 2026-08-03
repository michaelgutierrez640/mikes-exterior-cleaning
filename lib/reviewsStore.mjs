import crypto from 'crypto'
import { getAnalyticsRedis, isAnalyticsStorageConfigured } from './analyticsRedis.mjs'
import { sanitizePublicText } from './sanitizePublicText.mjs'

export const REVIEW_KEY_PREFIX = 'review:'
export const REVIEWS_ALL_KEY = 'reviews:all'
export const REVIEWS_RATE_PREFIX = 'reviews:ratelimit:'
export const REVIEWS_DUP_PREFIX = 'reviews:dup:'

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected']
export const MAX_REVIEWS_LIST = 500
export const MAX_NAME_LENGTH = 80
export const MAX_REVIEW_LENGTH = 2000
export const MIN_REVIEW_LENGTH = 8

/** @returns {boolean} */
export function isReviewsStorageConfigured() {
  return isAnalyticsStorageConfigured()
}

function reviewKey(id) {
  return `${REVIEW_KEY_PREFIX}${id}`
}

export function normalizeReviewId(value) {
  let id = String(value ?? '').trim()
  if (!id) return ''
  if (
    (id.startsWith('"') && id.endsWith('"')) ||
    (id.startsWith("'") && id.endsWith("'"))
  ) {
    id = id.slice(1, -1).trim()
  }
  if (id.startsWith(REVIEW_KEY_PREFIX)) id = id.slice(REVIEW_KEY_PREFIX.length)
  return id.slice(0, 80)
}

function nowIso() {
  return new Date().toISOString()
}

function newReviewId() {
  return `rev_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`
}

function trimStr(value, max) {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  return s.slice(0, max)
}

/** Normalize text for duplicate detection (lowercase, collapse whitespace). */
export function normalizeDuplicateKey(name, reviewText) {
  const n = String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  const t = String(reviewText || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  return crypto.createHash('sha256').update(`${n}\n${t}`).digest('hex').slice(0, 40)
}

/**
 * Validate public review ingest. Honeypot → status 204 (silent success at API layer).
 * @returns {{ ok: true, data: object } | { ok: false, error: string, status?: number }}
 */
export function validateReviewIngest(input = {}) {
  const honey = String(input.companyWebsite || input.website || input._gotcha || '').trim()
  if (honey) {
    return { ok: false, error: 'Rejected', status: 204 }
  }

  const name = trimStr(input.name, MAX_NAME_LENGTH)
  const reviewText = trimStr(input.reviewText ?? input.review ?? input.message, MAX_REVIEW_LENGTH)
  const displayPermission =
    input.displayPermission === true ||
    input.displayPermission === 'true' ||
    input.displayPermission === 'on' ||
    input.displayPermission === 1

  if (!name) return { ok: false, error: 'Name is required', status: 400 }
  if (!reviewText) return { ok: false, error: 'Review is required', status: 400 }
  if (reviewText.length < MIN_REVIEW_LENGTH) {
    return { ok: false, error: `Review must be at least ${MIN_REVIEW_LENGTH} characters`, status: 400 }
  }
  if (!displayPermission) {
    return {
      ok: false,
      error: 'Please check the box to allow displaying your review on the website.',
      status: 400,
    }
  }

  // Reject obvious script payloads even after trim
  if (/<script|javascript:|on\w+=/i.test(name) || /<script|javascript:|on\w+=/i.test(reviewText)) {
    return { ok: false, error: 'Invalid content', status: 400 }
  }

  return {
    ok: true,
    data: {
      name: sanitizePublicText(name, { maxLength: MAX_NAME_LENGTH }),
      reviewText: sanitizePublicText(reviewText, { maxLength: MAX_REVIEW_LENGTH }),
      displayPermission: true,
    },
  }
}

/**
 * Admin edit of customer wording (spelling only intent) — keep meaning, sanitize.
 * @returns {{ ok: true, data: object } | { ok: false, error: string, status?: number }}
 */
export function validateReviewAdminUpdate(input = {}) {
  const out = {}

  if (input.status !== undefined) {
    const status = String(input.status || '').trim()
    if (!REVIEW_STATUSES.includes(status)) {
      return { ok: false, error: 'Invalid status', status: 400 }
    }
    out.status = status
  }

  if (input.published !== undefined) {
    out.published = input.published === true || input.published === 'true'
  }

  if (input.name !== undefined) {
    const name = trimStr(input.name, MAX_NAME_LENGTH)
    if (!name) return { ok: false, error: 'Name is required', status: 400 }
    out.name = sanitizePublicText(name, { maxLength: MAX_NAME_LENGTH })
  }

  if (input.reviewText !== undefined) {
    const reviewText = trimStr(input.reviewText, MAX_REVIEW_LENGTH)
    if (!reviewText) return { ok: false, error: 'Review is required', status: 400 }
    if (reviewText.length < MIN_REVIEW_LENGTH) {
      return { ok: false, error: `Review must be at least ${MIN_REVIEW_LENGTH} characters`, status: 400 }
    }
    out.reviewText = sanitizePublicText(reviewText, { maxLength: MAX_REVIEW_LENGTH })
  }

  if (!Object.keys(out).length) {
    return { ok: false, error: 'No updates provided', status: 400 }
  }

  // Approved + published rules
  if (out.published === true && out.status === 'rejected') {
    return { ok: false, error: 'Rejected reviews cannot be published', status: 400 }
  }
  if (out.published === true && out.status === 'pending') {
    return { ok: false, error: 'Pending reviews cannot be published', status: 400 }
  }

  return { ok: true, data: out }
}

async function readReview(redis, id) {
  const raw = await redis.get(reviewKey(id))
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function writeReview(redis, review) {
  await redis.set(reviewKey(review.id), JSON.stringify(review))
}

/**
 * Rate limit: max `limit` creates per IP per `windowSec`.
 * @returns {{ allowed: boolean, remaining: number }}
 */
export async function checkReviewIngestRateLimit(ip, { limit = 5, windowSec = 3600 } = {}) {
  const redis = getAnalyticsRedis()
  if (!redis || !ip) return { allowed: true, remaining: limit }

  const key = `${REVIEWS_RATE_PREFIX}${ip}`
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, windowSec)
  }
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
}

/**
 * Duplicate protection: same name+text within 24h returns existing id without creating another.
 * @returns {{ duplicate: boolean, existingId?: string }}
 */
export async function checkReviewDuplicate(name, reviewText, { ttlSec = 86400 } = {}) {
  const redis = getAnalyticsRedis()
  if (!redis) return { duplicate: false }

  const hash = normalizeDuplicateKey(name, reviewText)
  const key = `${REVIEWS_DUP_PREFIX}${hash}`
  const existingId = await redis.get(key)
  if (existingId) {
    return { duplicate: true, existingId: String(existingId) }
  }
  return { duplicate: false, hash, key, ttlSec }
}

async function markDuplicate(redis, hash, id, ttlSec) {
  if (!hash || !id) return
  await redis.set(`${REVIEWS_DUP_PREFIX}${hash}`, id, { ex: ttlSec || 86400 })
}

/**
 * Create a pending website customer review. Never auto-publishes.
 */
export async function createReviewFromIngest(validated) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    const err = new Error('Reviews storage not configured')
    err.status = 503
    throw err
  }

  const dup = await checkReviewDuplicate(validated.name, validated.reviewText)
  if (dup.duplicate) {
    return { id: dup.existingId, createdAt: null, duplicate: true }
  }

  const id = newReviewId()
  const at = nowIso()
  const review = {
    id,
    name: validated.name,
    reviewText: validated.reviewText,
    displayPermission: true,
    status: 'pending',
    published: false,
    source: 'website',
    createdAt: at,
    updatedAt: at,
    moderatedAt: null,
  }

  await writeReview(redis, review)
  const score = Date.parse(at) || Date.now()
  await redis.zadd(REVIEWS_ALL_KEY, { score, member: id })
  if (dup.hash) {
    await markDuplicate(redis, dup.hash, id, dup.ttlSec)
  }

  return { id, createdAt: at, duplicate: false }
}

export async function getReview(id) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    const err = new Error('Reviews storage not configured')
    err.status = 503
    throw err
  }
  const normalized = normalizeReviewId(id)
  if (!normalized) return null
  return readReview(redis, normalized)
}

async function loadAllReviews(limit = MAX_REVIEWS_LIST) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    const err = new Error('Reviews storage not configured')
    err.status = 503
    throw err
  }

  const ids = await redis.zrange(REVIEWS_ALL_KEY, 0, Math.max(0, Math.min(limit, MAX_REVIEWS_LIST) - 1), {
    rev: true,
  })

  const reviews = []
  for (const rawId of ids || []) {
    const id = normalizeReviewId(rawId)
    if (!id) continue
    const review = await readReview(redis, id)
    if (review) reviews.push(review)
  }
  return reviews
}

export function filterReviews(reviews, { status = '', q = '', published } = {}) {
  const query = String(q || '').trim().toLowerCase()
  const statusFilter = String(status || '').trim()
  const publishedFilter =
    published === undefined || published === '' || published === null
      ? null
      : published === true || published === 'true' || published === '1'

  return (reviews || []).filter((review) => {
    if (statusFilter && review.status !== statusFilter) return false
    if (publishedFilter !== null && Boolean(review.published) !== publishedFilter) return false
    if (query) {
      const hay = [review.name, review.reviewText, review.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  })
}

export async function listReviews(filters = {}) {
  const all = await loadAllReviews()
  return filterReviews(all, filters)
}

/** Public-safe published approved reviews (newest first). */
export async function listPublishedWebsiteReviews({ limit = 24 } = {}) {
  const all = await loadAllReviews()
  return all
    .filter((r) => r.status === 'approved' && r.published === true && r.displayPermission === true)
    .slice(0, Math.max(0, limit))
    .map((r) => toPublicReview(r))
}

export function toPublicReview(review) {
  return {
    id: review.id,
    name: review.name,
    reviewText: review.reviewText,
    createdAt: review.createdAt,
    source: 'website',
  }
}

export function toAdminReviewListItem(review) {
  return {
    id: review.id,
    name: review.name,
    reviewText: review.reviewText,
    status: review.status,
    published: Boolean(review.published),
    displayPermission: Boolean(review.displayPermission),
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    moderatedAt: review.moderatedAt || null,
  }
}

/**
 * Update review moderation fields.
 */
export async function updateReview(id, patch) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    const err = new Error('Reviews storage not configured')
    err.status = 503
    throw err
  }

  const normalized = normalizeReviewId(id)
  const review = await readReview(redis, normalized)
  if (!review) {
    const err = new Error('Review not found')
    err.status = 404
    throw err
  }

  const next = { ...review }
  if (patch.name !== undefined) next.name = patch.name
  if (patch.reviewText !== undefined) next.reviewText = patch.reviewText
  if (patch.status !== undefined) next.status = patch.status

  if (patch.published !== undefined) {
    if (patch.published && next.status !== 'approved') {
      const err = new Error('Only approved reviews can be published')
      err.status = 400
      throw err
    }
    next.published = Boolean(patch.published)
  }

  // Approving does not auto-publish; rejecting forces unpublished
  if (patch.status === 'rejected') {
    next.published = false
  }
  if (patch.status === 'pending') {
    next.published = false
  }
  if (patch.status === 'approved' || patch.status === 'rejected') {
    next.moderatedAt = nowIso()
  }

  next.updatedAt = nowIso()
  await writeReview(redis, next)
  return next
}

export async function deleteReview(id) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    const err = new Error('Reviews storage not configured')
    err.status = 503
    throw err
  }

  const normalized = normalizeReviewId(id)
  if (!normalized) {
    const err = new Error('Review not found')
    err.status = 404
    throw err
  }

  await redis.del(reviewKey(normalized))
  await redis.zrem(REVIEWS_ALL_KEY, normalized)
  return { ok: true, id: normalized }
}
