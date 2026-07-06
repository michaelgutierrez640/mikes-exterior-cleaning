import { getGoogleReviewsLink } from '../../config/business'
import { getReviewerInitials } from '../../config/googleReviews'
import { getServiceReviews } from '../../utils/serviceReviews'
import ScrollReveal from '../ScrollReveal'
import GoogleReviewsBadge from '../ui/GoogleReviewsBadge'
import GoogleStars from '../ui/GoogleStars'

function ReviewAvatar({ reviewerName }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-royal-600 text-sm font-semibold text-white ring-1 ring-black/[0.04]">
      {getReviewerInitials(reviewerName)}
    </div>
  )
}

export default function ServiceTestimonials({ slug, serviceName, id }) {
  const reviews = getServiceReviews(slug, 3)
  const reviewsLink = getGoogleReviewsLink()

  return (
    <section className="service-section bg-section-reviews" aria-labelledby={id}>
      <div className="section-container">
        <ScrollReveal className="section-header max-w-2xl">
          <p className="section-label">Google Reviews</p>
          <h2 id={id} className="section-title">
            What Clients Say About Our {serviceName}
          </h2>
          <div className="mt-7">
            <GoogleReviewsBadge variant="light" size="md" link />
          </div>
        </ScrollReveal>

        <div className="section-content grid gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {reviews.map((review, i) => (
            <ScrollReveal key={`${review.reviewerName}-${review.date}`} stagger={i + 1}>
              <blockquote className="glass-card flex h-full flex-col p-6 sm:p-7">
                <GoogleStars count={review.rating} />
                <p className="mt-4 flex-1 text-[0.9375rem] leading-[1.7] text-gray-600">
                  &ldquo;{review.reviewText}&rdquo;
                </p>
                <footer className="mt-6 flex items-center gap-3 border-t border-black/[0.05] pt-5">
                  <ReviewAvatar reviewerName={review.reviewerName} />
                  <cite className="not-italic">
                    <p className="text-[0.9375rem] font-semibold text-navy-900">{review.reviewerName}</p>
                    <p className="mt-0.5 text-[0.8125rem] text-gray-500">{review.date} · Google</p>
                  </cite>
                </footer>
              </blockquote>
            </ScrollReveal>
          ))}
        </div>

        {reviewsLink && (
          <ScrollReveal className="mt-10 text-center sm:mt-12">
            <a
              href={reviewsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-sm gap-2.5"
            >
              Read all reviews on Google
            </a>
          </ScrollReveal>
        )}
      </div>
    </section>
  )
}
