import { useEffect, useState } from 'react'
import { useGoogleReviews, useGoogleReviewsLink } from '../../context/GoogleReviewsContext'
import { getReviewerInitials } from '../../config/googleReviews'
import { fetchPublishedWebsiteReviews } from '../../services/websiteReviewsApi'
import ScrollReveal from '../ScrollReveal'
import GoogleReviewsBadge from '../ui/GoogleReviewsBadge'
import GoogleStars from '../ui/GoogleStars'

function ReviewAvatar({ reviewerName }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-royal-600 text-sm font-semibold text-white ring-1 ring-black/[0.04]">
      {getReviewerInitials(reviewerName)}
    </div>
  )
}

function formatWebsiteReviewDate(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

export default function Reviews() {
  const { reviews, reviewsUrl, loading, error, fromApi } = useGoogleReviews()
  const reviewsLink = reviewsUrl
  const [websiteReviews, setWebsiteReviews] = useState([])

  useEffect(() => {
    let cancelled = false
    fetchPublishedWebsiteReviews()
      .then((list) => {
        if (!cancelled) setWebsiteReviews(list)
      })
      .catch(() => {
        if (!cancelled) setWebsiteReviews([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section id="reviews" className="section-padding relative bg-section-reviews" aria-labelledby="reviews-heading">
      <div className="section-container relative">
        <ScrollReveal className="section-header" animation="reveal-fade">
          <p className="section-label">Google Reviews</p>
          <h2 id="reviews-heading" className="section-title">
            What Our Clients Say
          </h2>
          <div className="mt-7">
            <GoogleReviewsBadge variant="light" size="md" link />
          </div>
        </ScrollReveal>

        <div className="section-content grid gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {reviews.map((review, i) => (
            <ScrollReveal key={`${review.reviewerName}-${review.date}-${i}`} stagger={i + 1}>
              <blockquote className="glass-card h-full p-7 sm:p-8">
                <GoogleStars count={review.rating} />
                <p className="mt-5 text-[0.9375rem] leading-[1.7] text-gray-600">&ldquo;{review.reviewText}&rdquo;</p>
                <footer className="mt-7 flex items-center gap-3.5 border-t border-black/[0.05] pt-6">
                  <ReviewAvatar reviewerName={review.reviewerName} />
                  <cite className="not-italic">
                    <p className="text-[0.9375rem] font-semibold text-navy-900">{review.reviewerName}</p>
                    <p className="mt-0.5 text-[0.8125rem] text-gray-500">{review.date}</p>
                    <p className="mt-0.5 text-[0.75rem] font-medium text-gray-400">Google review</p>
                  </cite>
                </footer>
              </blockquote>
            </ScrollReveal>
          ))}
        </div>

        {loading && (
          <p className="mt-8 text-center text-sm text-gray-500" role="status" aria-live="polite">
            Loading latest Google reviews…
          </p>
        )}

        {!loading && error && (
          <p className="mt-8 text-center text-sm text-gray-500" role="status" aria-live="polite">
            {error}
          </p>
        )}

        {!loading && !error && fromApi && !reviews.length && (
          <p className="mt-8 text-center text-sm text-gray-500" role="status" aria-live="polite">
            No reviews are available right now.
          </p>
        )}

        {reviewsLink && (
          <ScrollReveal className="mt-12 text-center sm:mt-14" delay="delay-200">
            <a
              href={reviewsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-sm gap-2.5"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Read More on Google
            </a>
          </ScrollReveal>
        )}

        {websiteReviews.length > 0 && (
          <div className="mt-16 border-t border-black/[0.06] pt-14 sm:mt-20 sm:pt-16">
            <ScrollReveal className="section-header" animation="reveal-fade">
              <p className="section-label">Website Customer Reviews</p>
              <h3 className="section-title text-[1.75rem] sm:text-[2rem]">
                From Customers on Our Website
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-gray-500">
                These reviews were submitted on mikesexteriorcleaning.com. They are website customer
                reviews — not Google reviews.
              </p>
            </ScrollReveal>

            <div className="section-content grid gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {websiteReviews.map((review, i) => (
                <ScrollReveal key={review.id || `${review.name}-${i}`} stagger={i + 1}>
                  <blockquote className="glass-card h-full p-7 sm:p-8">
                    <p className="text-[0.75rem] font-semibold tracking-wide text-royal-600 uppercase">
                      Website customer review
                    </p>
                    <p className="mt-4 text-[0.9375rem] leading-[1.7] text-gray-600">
                      &ldquo;{review.reviewText}&rdquo;
                    </p>
                    <footer className="mt-7 flex items-center gap-3.5 border-t border-black/[0.05] pt-6">
                      <ReviewAvatar reviewerName={review.name} />
                      <cite className="not-italic">
                        <p className="text-[0.9375rem] font-semibold text-navy-900">{review.name}</p>
                        {formatWebsiteReviewDate(review.createdAt) && (
                          <p className="mt-0.5 text-[0.8125rem] text-gray-500">
                            {formatWebsiteReviewDate(review.createdAt)}
                          </p>
                        )}
                      </cite>
                    </footer>
                  </blockquote>
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
