/**
 * Google Business Profile reviews (manual fallback data).
 * Live reviews are loaded from /api/google-reviews via GoogleReviewsProvider.
 */

import { MANUAL_GOOGLE_REVIEWS } from '../../lib/googleReviewsData.mjs'

/**
 * @typedef {Object} GoogleReview
 * @property {string} reviewerName
 * @property {number} rating
 * @property {string} reviewText
 * @property {string} date
 * @property {'Google'} source
 * @property {boolean} [isPlaceholder]
 */

/** @type {GoogleReview[]} */
export const GOOGLE_REVIEWS = MANUAL_GOOGLE_REVIEWS

/**
 * @param {GoogleReview} review
 * @returns {boolean}
 */
export function isRealGoogleReview(review) {
  return review.source === 'Google' && review.isPlaceholder !== true
}

/**
 * @param {string} reviewerName
 * @returns {string}
 */
export function getReviewerInitials(reviewerName) {
  const parts = reviewerName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length || reviewerName.startsWith('[')) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1].replace('.', '')[0]}`.toUpperCase()
}

/**
 * Manual fallback reviews shown when the API is unavailable.
 *
 * @returns {GoogleReview[]}
 */
export function getDisplayedGoogleReviews() {
  return GOOGLE_REVIEWS.filter(isRealGoogleReview)
}
