/**
 * Manual Google reviews — used as fallback when Places API is unavailable.
 * Shared by the frontend and /api/google-reviews.
 */

export const MANUAL_GOOGLE_REVIEWS = [
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

export const FALLBACK_BUSINESS_NAME = "Mike's Exterior Cleaning Services"
export const FALLBACK_RATING = 5.0
export const FALLBACK_REVIEW_COUNT = 44

export function buildFallbackGoogleReviewsResponse(reason = 'manual') {
  return {
    source: 'fallback',
    reason,
    businessName: FALLBACK_BUSINESS_NAME,
    rating: FALLBACK_RATING,
    reviewCount: FALLBACK_REVIEW_COUNT,
    reviewsUrl: null,
    reviews: MANUAL_GOOGLE_REVIEWS,
    fetchedAt: new Date().toISOString(),
  }
}

export function mapGooglePlacesReview(review) {
  return {
    reviewerName: review.author_name || 'Google User',
    rating: Number(review.rating) || 5,
    reviewText: review.text || '',
    date: review.relative_time_description || '',
    source: 'Google',
  }
}
