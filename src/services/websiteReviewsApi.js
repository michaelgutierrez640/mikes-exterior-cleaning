/**
 * Public website customer reviews (not Google reviews).
 */

async function parseJson(res) {
  return res.json().catch(() => ({}))
}

/**
 * Submit a website customer review. Always stored as pending.
 */
export async function submitWebsiteReview({ name, reviewText, displayPermission, companyWebsite = '' }) {
  const res = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      name,
      reviewText,
      displayPermission,
      companyWebsite,
    }),
  })
  const data = await parseJson(res)
  if (!res.ok) {
    const err = new Error(data.error || 'Unable to submit review')
    err.status = res.status
    throw err
  }
  return data
}

/**
 * Fetch approved + published website reviews for the public Reviews section.
 */
export async function fetchPublishedWebsiteReviews() {
  const res = await fetch('/api/reviews?public=1', {
    headers: { Accept: 'application/json' },
  })
  const data = await parseJson(res)
  if (!res.ok) {
    const err = new Error(data.error || 'Unable to load website reviews')
    err.status = res.status
    throw err
  }
  return Array.isArray(data.reviews) ? data.reviews : []
}
