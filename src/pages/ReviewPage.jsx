import { useState } from 'react'
import { getReviewPageSeo, getReviewPageSchemas } from '../config/seo'
import { DEFAULT_OG_IMAGE } from '../config/site'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import StarRatingInput from '../components/review/StarRatingInput'
import { submitWebsiteReview } from '../services/websiteReviewsApi'

const pageSeo = getReviewPageSeo()

export default function ReviewPage() {
  const schemas = getReviewPageSchemas()
  const [name, setName] = useState('')
  const [rating, setRating] = useState(null)
  const [reviewText, setReviewText] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    const trimmedReview = reviewText.trim()
    if (!trimmedName) {
      setError('Please enter your name.')
      return
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError('Please select a rating from 1 to 5 stars.')
      return
    }
    if (!trimmedReview) {
      setError('Please enter your review.')
      return
    }

    setSubmitting(true)
    try {
      await submitWebsiteReview({
        name: trimmedName,
        rating,
        reviewText: trimmedReview,
        companyWebsite,
      })
      setDone(true)
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <SeoHead {...pageSeo} ogImage={DEFAULT_OG_IMAGE} />
      <JsonLd data={schemas} id="review-page-schema" />

      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900/90 to-royal-900/20" aria-hidden="true" />
        <div className="section-container relative max-w-xl">
          <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">How Did We Do?</h1>
          <p className="mt-4 text-base leading-relaxed text-white/75">
            Thank you for choosing Mike&apos;s Exterior Cleaning Services. Please share your experience below.
          </p>
          <p className="mt-3 text-[0.8125rem] text-white/45">
            Website customer review — not a Google review.
          </p>
        </div>
      </section>

      <section className="section-container -mt-4 max-w-xl pb-20 sm:pb-24">
        <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(10,22,40,0.08)] ring-1 ring-black/[0.05] sm:p-8">
          {done ? (
            <p className="text-center text-lg font-semibold text-navy-900" role="status" aria-live="polite">
              Thank you! Your review was submitted.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="relative space-y-6" noValidate>
              {/* Honeypot — hidden from customers */}
              <div className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
                <label htmlFor="companyWebsite">Company website</label>
                <input
                  id="companyWebsite"
                  name="companyWebsite"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="review-name" className="mb-2 block text-base font-semibold text-navy-900">
                  Name
                </label>
                <input
                  id="review-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className="input-light min-h-14 w-full text-base"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                />
              </div>

              <div>
                <p className="mb-2 block text-base font-semibold text-navy-900" id="rating-label">
                  Star rating
                </p>
                <div aria-labelledby="rating-label">
                  <StarRatingInput value={rating} onChange={setRating} />
                </div>
              </div>

              <div>
                <label htmlFor="review-text" className="mb-2 block text-base font-semibold text-navy-900">
                  Review
                </label>
                <textarea
                  id="review-text"
                  name="reviewText"
                  className="input-light min-h-40 w-full resize-y text-base leading-relaxed"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  maxLength={2000}
                  required
                />
              </div>

              {error && (
                <p className="text-[0.9375rem] font-medium text-red-600" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="btn-royal min-h-14 w-full text-lg font-semibold"
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>

              <p className="text-center text-[0.875rem] leading-snug text-gray-500">
                By submitting, you agree that your review may be displayed on our website.
              </p>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
