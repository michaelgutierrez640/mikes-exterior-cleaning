/**
 * Fetches cached Google review data from the serverless API route.
 * The API key never reaches the browser.
 */

/**
 * @typedef {Object} GoogleReviewsApiResponse
 * @property {'google-places-api' | 'fallback'} source
 * @property {string} [reason]
 * @property {string} businessName
 * @property {number | null} rating
 * @property {number | null} reviewCount
 * @property {string | null} reviewsUrl
 * @property {Array<{ reviewerName: string, rating: number, reviewText: string, date: string, source: string }>} reviews
 * @property {string} fetchedAt
 * @property {boolean} [cached]
 */

/** @type {GoogleReviewsApiResponse | null} */
let clientCache = null
/** @type {number} */
let clientCacheExpiresAt = 0

const CLIENT_CACHE_TTL_MS = 30 * 60 * 1000

/**
 * @returns {Promise<GoogleReviewsApiResponse | null>}
 */
export async function fetchGoogleReviewsFromApi() {
  if (clientCache && Date.now() < clientCacheExpiresAt) {
    return clientCache
  }

  try {
    const response = await fetch('/api/google-reviews', {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    clientCache = data
    clientCacheExpiresAt = Date.now() + CLIENT_CACHE_TTL_MS
    return data
  } catch {
    return null
  }
}
