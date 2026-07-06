import { getDisplayedGoogleReviews } from '../config/googleReviews'
import { getServiceEnhancements } from '../config/servicePageEnhancements'

/**
 * Returns up to `limit` Google reviews most relevant to a service slug.
 * Falls back to highest-rated recent reviews if keyword matches are sparse.
 *
 * @param {string} slug
 * @param {number} [limit=3]
 */
export function getServiceReviews(slug, limit = 3) {
  const reviews = getDisplayedGoogleReviews()
  const config = getServiceEnhancements(slug)
  const keywords = config?.reviewKeywords ?? []

  if (!keywords.length) {
    return reviews.slice(0, limit)
  }

  const scored = reviews.map((review) => {
    const text = review.reviewText.toLowerCase()
    const score = keywords.reduce((sum, kw) => (text.includes(kw.toLowerCase()) ? sum + 1 : sum), 0)
    return { review, score }
  })

  scored.sort((a, b) => b.score - a.score)

  const matched = scored.filter((s) => s.score > 0).map((s) => s.review)
  const pool = matched.length >= limit ? matched : [...matched, ...reviews.filter((r) => !matched.includes(r))]

  const unique = []
  const seen = new Set()
  for (const review of pool) {
    const key = `${review.reviewerName}-${review.date}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(review)
    if (unique.length >= limit) break
  }

  return unique
}
