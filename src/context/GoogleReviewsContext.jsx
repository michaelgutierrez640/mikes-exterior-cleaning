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
    loading: false,
    fromApi: false,
  }
}

export function GoogleReviewsProvider({ children }) {
  const [state, setState] = useState(getManualSnapshot)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const data = await fetchGoogleReviewsFromApi()
      if (cancelled || !data) return

      setState({
        source: data.source,
        businessName: data.businessName || BUSINESS.name,
        rating: data.rating ?? BUSINESS.googleReviewRating,
        reviewCount: data.reviewCount ?? BUSINESS.googleReviews,
        reviewsUrl: data.reviewsUrl ?? BUSINESS.googleReviewsUrl,
        reviews:
          data.reviews?.length > 0
            ? data.reviews.filter((review) => review.source === 'Google')
            : getDisplayedGoogleReviews(),
        fetchedAt: data.fetchedAt ?? null,
        loading: false,
        fromApi: data.source === 'google-places-api',
      })
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
    return getManualSnapshot()
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
