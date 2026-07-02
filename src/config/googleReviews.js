/**
 * Google Business Profile reviews.
 *
 * Manually transcribed from Google Business Profile screenshots.
 * Future: set GOOGLE_REVIEWS_SOURCE to 'places-api' and configure
 * VITE_GOOGLE_PLACES_API_KEY + googlePlaceId in business.js.
 */

export const GOOGLE_REVIEWS_SOURCE = 'manual'

/**
 * @typedef {Object} GoogleReview
 * @property {string} reviewerName
 * @property {number} rating
 * @property {string} reviewText
 * @property {string} date
 * @property {'Google'} source
 * @property {boolean} [isPlaceholder]
 */

/**
 * @type {GoogleReview[]}
 */
export const GOOGLE_REVIEWS = [
  {
    reviewerName: 'Sue',
    rating: 5,
    reviewText: 'Mike was prompt and kind and did a great job',
    date: '5 days ago',
    source: 'Google',
  },
  {
    reviewerName: 'Deb',
    rating: 5,
    reviewText:
      "As usual Mike did an outstanding job. He did our plantation shutters and solar panels. You won't go wrong choosing Mike for the job.",
    date: 'a week ago',
    source: 'Google',
  },
  {
    reviewerName: 'Cathy',
    rating: 5,
    reviewText:
      "Needed my windows cleaned called Mike's exterior cleaning service. Came out the next day on time. Mike did a great job the windows are really clean and sparkling. Super customer service, great price, and very friendly.",
    date: '3 weeks ago',
    source: 'Google',
  },
  {
    reviewerName: 'Chris',
    rating: 5,
    reviewText:
      'Mike is very professional- he showed up on time, did a great job and locked up the property once finished. I highly recommend Mike and will be using him again.',
    date: 'a month ago',
    source: 'Google',
  },
  {
    reviewerName: 'Frank',
    rating: 5,
    reviewText:
      'Mike was a professional service provider. He replace 30 screens on custom homes, he work quickly, very friendly. We would highly recommend mikes services.',
    date: 'a month ago',
    source: 'Google',
  },
  {
    reviewerName: 'Lorena',
    rating: 5,
    reviewText:
      'Very nice, professional and did a great job! Will definitely be using him again in the future.',
    date: 'a month ago',
    source: 'Google',
  },
  {
    reviewerName: 'Suzanne',
    rating: 5,
    reviewText:
      "Mike came out at the time range he promised. He did a good job and we will definitely be using his services again. Very professional and definitely knows what he's doing .",
    date: 'a month ago',
    source: 'Google',
  },
  {
    reviewerName: 'Ruben',
    rating: 5,
    reviewText:
      'Work came out amazing. He was willing to beat out any quote I received and work was done in a timely manner',
    date: '4 months ago',
    source: 'Google',
  },
  {
    reviewerName: 'Chris K.',
    rating: 5,
    reviewText:
      'Had Mike do our interior and exterior windows. He did a great job. Quick and efficient! Beautifully cleaned when he was done!',
    date: '11 months ago',
    source: 'Google',
  },
  {
    reviewerName: 'Marcie',
    rating: 5,
    reviewText:
      'Mike and team did an amazing job. Very conscientious and courteous. Definitely will use this service again',
    date: 'a year ago',
    source: 'Google',
  },
]

/** @type {GoogleReview[] | null} */
let cachedApiReviews = null

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
 * Reviews shown on the site (placeholders excluded).
 *
 * @returns {GoogleReview[]}
 */
export function getDisplayedGoogleReviews() {
  const reviews =
    GOOGLE_REVIEWS_SOURCE === 'places-api' && cachedApiReviews?.length
      ? cachedApiReviews
      : GOOGLE_REVIEWS

  return reviews.filter(isRealGoogleReview)
}

/**
 * @param {GoogleReview[]} reviews
 */
export function setGoogleReviewsFromApi(reviews) {
  cachedApiReviews = reviews
}
