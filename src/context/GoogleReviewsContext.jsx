import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { BUSINESS } from '../config/business'
import { getDisplayedGoogleReviews } from '../config/googleReviews'
import { fetchGoogleReviewsFromApi } from '../services/googleReviewsApi'

const GoogleReviewsContext = createContext(null)

function getManualSnapshot() {
  return {
    source: 'fallback',
    businessName: BUSINESS.name,
    rating: BUSINESS.googleReviewRating,
    reviewCount: BUSINESS.googleReviews,
    reviewsUrl: BUSINESS.googleReviewsUrl,
    reviews: getDisplayedGoogleReviews(),
    fetchedAt: null,
    loading: true,
    error: null,
    fromApi: false,
  }
}

export function GoogleReviewsProvider({ children }) {
  const [state, setState] = useState(getManualSnapshot)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await fetchGoogleReviewsFromApi()
        if (cancelled || !data) {
          if (!cancelled) setState((prev) => ({ ...prev, loading: false }))
          return
        }

        const apiReviews =
          Array.isArray(data.reviews) && data.reviews.length
            ? data.reviews
                .map((review) => ({
                  reviewerName: review.reviewerName ?? 'Google User',
                  rating: Number(review.rating) || 5,
                  reviewText: String(review.reviewText ?? '').trim(),
                  date: String(review.date ?? '').trim(),
                  source: 'Google',
                }))
                .filter((review) => review.reviewText.length > 0)
            : []

        setState({
          source: data.source,
          businessName: data.businessName || BUSINESS.name,
          rating: data.rating ?? BUSINESS.googleReviewRating,
          reviewCount: data.reviewCount ?? BUSINESS.googleReviews,
          reviewsUrl: data.reviewsUrl ?? BUSINESS.googleReviewsUrl,
          reviews: apiReviews.length ? apiReviews : getDisplayedGoogleReviews(),
          fetchedAt: data.fetchedAt ?? null,
          loading: false,
          error: null,
          fromApi:
            data.source === 'google-business-profile' ||
            data.source === 'redis' ||
            data.source === 'google-places-api',
        })
      } catch (error) {
        console.error('[GoogleReviewsProvider]', error)
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error: 'Unable to load live reviews.' }))
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => state, [state])

  return <GoogleReviewsContext.Provider value={value}>{children}</GoogleReviewsContext.Provider>
}

export function useGoogleReviews() {
  const context = useContext(GoogleReviewsContext)
  if (!context) {
    const snapshot = getManualSnapshot()
    return { ...snapshot, loading: false }
  }
  return context
}

export function useGoogleReviewsBadgeLabel() {
  const { rating, reviewCount } = useGoogleReviews()
  if (rating != null && reviewCount != null) {
    return `${Number(rating).toFixed(1)} Rating • ${reviewCount} Google Reviews`
  }
  if (reviewCount != null) {
    return `${reviewCount} Google Reviews`
  }
  return 'Google Reviews'
}

export function useGoogleReviewsLink() {
  const { reviewsUrl } = useGoogleReviews()
  return reviewsUrl ?? BUSINESS.googleReviewsUrl ?? null
}
