import {
  buildFallbackGoogleReviewsResponse,
  mapGooglePlacesReview,
} from '../lib/googleReviewsData.mjs'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const DISPLAY_REVIEW_LIMIT = 6

/** @type {{ data: object | null, expiresAt: number }} */
const cache = { data: null, expiresAt: 0 }

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  'Content-Type': 'application/json; charset=utf-8',
}

function sendJson(res, status, payload) {
  res.setHeader('Cache-Control', CACHE_HEADERS['Cache-Control'])
  res.setHeader('Content-Type', CACHE_HEADERS['Content-Type'])
  res.status(status).json(payload)
}

function getConfig() {
  return {
    apiKey: process.env.GOOGLE_PLACES_API_KEY?.trim(),
    placeId: process.env.GOOGLE_PLACE_ID?.trim(),
  }
}

async function fetchPlaceDetails(apiKey, placeId) {
  const fields = ['name', 'rating', 'user_ratings_total', 'reviews', 'url'].join(',')
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', fields)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('reviews_no_translations', 'true')

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Google Places HTTP ${response.status}`)
  }

  const payload = await response.json()
  if (payload.status !== 'OK') {
    throw new Error(`Google Places status: ${payload.status}`)
  }

  return payload.result
}

function buildLiveResponse(place) {
  const reviews = (place.reviews || [])
    .map(mapGooglePlacesReview)
    .filter((review) => review.reviewText.trim().length > 0)
    .slice(0, DISPLAY_REVIEW_LIMIT)

  return {
    source: 'google-places-api',
    businessName: place.name || buildFallbackGoogleReviewsResponse().businessName,
    rating: place.rating ?? null,
    reviewCount: place.user_ratings_total ?? null,
    reviewsUrl: place.url || null,
    reviews,
    fetchedAt: new Date().toISOString(),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  if (cache.data && Date.now() < cache.expiresAt) {
    return sendJson(res, 200, { ...cache.data, cached: true })
  }

  const { apiKey, placeId } = getConfig()

  if (!apiKey || !placeId) {
    const fallback = buildFallbackGoogleReviewsResponse('missing-env')
    cache.data = fallback
    cache.expiresAt = Date.now() + CACHE_TTL_MS
    return sendJson(res, 200, { ...fallback, cached: false })
  }

  try {
    const place = await fetchPlaceDetails(apiKey, placeId)
    const live = buildLiveResponse(place)
    cache.data = live
    cache.expiresAt = Date.now() + CACHE_TTL_MS
    return sendJson(res, 200, { ...live, cached: false })
  } catch (error) {
    console.error('[google-reviews]', error)
    const fallback = buildFallbackGoogleReviewsResponse('api-error')
    cache.data = fallback
    cache.expiresAt = Date.now() + 5 * 60 * 1000
    return sendJson(res, 200, { ...fallback, cached: false })
  }
}
