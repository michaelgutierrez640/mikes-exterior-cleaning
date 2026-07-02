/**
 * Google Places API integration (not yet configured).
 *
 * To enable live Google Business Profile reviews:
 * 1. Create a Google Cloud project and enable Places API (New).
 * 2. Add VITE_GOOGLE_PLACES_API_KEY to your environment.
 * 3. Set googlePlaceId in src/config/business.js.
 * 4. Call initGoogleReviews() on app startup.
 */

import { BUSINESS } from '../config/business'
import { GOOGLE_REVIEWS_SOURCE, setGoogleReviewsFromApi } from '../config/googleReviews'

/**
 * @param {string} placeId
 * @returns {Promise<import('../config/googleReviews').GoogleReview[] | null>}
 */
export async function fetchGooglePlaceReviews(placeId) {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
  if (!apiKey || !placeId) return null

  // Places API (New) — implement when API key is available:
  // GET https://places.googleapis.com/v1/places/{placeId}
  // Field mask: reviews,rating,userRatingCount
  // Map response.reviews to { reviewerName, rating, reviewText, date, source: 'Google' }.

  console.warn(
    '[googlePlacesReviews] Places API key or fetch implementation not configured. Using manual Google reviews.',
  )
  return null
}

/**
 * Attempts to load live reviews; falls back to manual data in googleReviews.js.
 */
export async function initGoogleReviews() {
  if (GOOGLE_REVIEWS_SOURCE !== 'places-api') return

  const placeId = BUSINESS.googlePlaceId
  if (!placeId) return

  const reviews = await fetchGooglePlaceReviews(placeId)
  if (reviews?.length) {
    setGoogleReviewsFromApi(reviews)
  }
}
