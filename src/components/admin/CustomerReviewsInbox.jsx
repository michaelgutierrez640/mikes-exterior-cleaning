import { useCallback, useEffect, useState } from 'react'
import {
  deleteAdminWebsiteReview,
  fetchAdminWebsiteReviews,
  updateAdminWebsiteReview,
} from '../../services/adminApi'
import { absoluteUrl } from '../../config/site'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

function formatSubmittedAt(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return String(iso).slice(0, 16)
  }
}

function StatusPill({ status, published }) {
  const tones = {
    pending: 'bg-amber-50 text-amber-800 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    rejected: 'bg-red-50 text-red-800 ring-red-200',
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span
        className={[
          'inline-flex rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ring-1',
          tones[status] || 'bg-gray-50 text-gray-700 ring-gray-200',
        ].join(' ')}
      >
        {status}
      </span>
      {status === 'approved' && (
        <span
          className={[
            'inline-flex rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ring-1',
            published ? 'bg-royal-50 text-royal-800 ring-royal-200' : 'bg-gray-50 text-gray-600 ring-gray-200',
          ].join(' ')}
        >
          {published ? 'published' : 'unpublished'}
        </span>
      )}
    </span>
  )
}

function ReviewCard({ review, onChanged, onUnauthorized }) {
  const [name, setName] = useState(review.name || '')
  const [reviewText, setReviewText] = useState(review.reviewText || '')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setName(review.name || '')
    setReviewText(review.reviewText || '')
  }, [review.id, review.name, review.reviewText, review.updatedAt])

  async function run(action, fn) {
    setBusy(action)
    setError('')
    try {
      await fn()
      onChanged?.()
    } catch (err) {
      if (err?.unauthorized) {
        onUnauthorized?.(true)
        return
      }
      setError(err?.message || 'Action failed')
    } finally {
      setBusy('')
    }
  }

  function copyReviewLink() {
    const link = absoluteUrl('/review')
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <article className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <StatusPill status={review.status} published={review.published} />
          <p className="mt-2 text-[0.9375rem] font-semibold text-navy-900">
            {Number.isInteger(review.rating)
              ? `${review.rating} out of 5`
              : 'No star rating'}
          </p>
          <p className="mt-1 text-[0.8125rem] text-gray-500">
            Submitted {formatSubmittedAt(review.createdAt)}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary btn-sm !rounded-xl"
          onClick={copyReviewLink}
        >
          {copied ? 'Copied' : 'Copy review link'}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-[0.75rem] font-semibold tracking-wide text-gray-500 uppercase">
            Name
          </label>
          <input
            className="input-light w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.75rem] font-semibold tracking-wide text-gray-500 uppercase">
            Review
          </label>
          <textarea
            className="input-light min-h-28 w-full resize-y"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            maxLength={2000}
          />
          <p className="mt-1 text-[0.75rem] text-gray-400">
            You can fix obvious spelling errors. Do not change the customer&apos;s meaning.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary btn-sm !rounded-xl"
          disabled={Boolean(busy)}
          onClick={() =>
            run('save', () =>
              updateAdminWebsiteReview(review.id, { name, reviewText }),
            )
          }
        >
          {busy === 'save' ? 'Saving…' : 'Save text'}
        </button>

        {review.status === 'pending' && (
          <>
            <button
              type="button"
              className="btn-royal btn-sm !rounded-xl"
              disabled={Boolean(busy)}
              onClick={() =>
                run('approve', () =>
                  updateAdminWebsiteReview(review.id, {
                    status: 'approved',
                    name,
                    reviewText,
                  }),
                )
              }
            >
              {busy === 'approve' ? '…' : 'Approve'}
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm !rounded-xl"
              disabled={Boolean(busy)}
              onClick={() =>
                run('reject', () => updateAdminWebsiteReview(review.id, { status: 'rejected' }))
              }
            >
              Reject
            </button>
          </>
        )}

        {review.status === 'approved' && !review.published && (
          <button
            type="button"
            className="btn-royal btn-sm !rounded-xl"
            disabled={Boolean(busy)}
            onClick={() =>
              run('publish', () => updateAdminWebsiteReview(review.id, { published: true }))
            }
          >
            Publish
          </button>
        )}

        {review.status === 'approved' && review.published && (
          <button
            type="button"
            className="btn-secondary btn-sm !rounded-xl"
            disabled={Boolean(busy)}
            onClick={() =>
              run('unpublish', () => updateAdminWebsiteReview(review.id, { published: false }))
            }
          >
            Unpublish
          </button>
        )}

        {review.status === 'rejected' && (
          <button
            type="button"
            className="btn-royal btn-sm !rounded-xl"
            disabled={Boolean(busy)}
            onClick={() =>
              run('reapprove', () =>
                updateAdminWebsiteReview(review.id, { status: 'approved', name, reviewText }),
              )
            }
          >
            Approve
          </button>
        )}

        <button
          type="button"
          className="btn-secondary btn-sm !rounded-xl !text-red-700"
          disabled={Boolean(busy)}
          onClick={() => {
            if (!window.confirm('Delete this review permanently?')) return
            run('delete', () => deleteAdminWebsiteReview(review.id))
          }}
        >
          {busy === 'delete' ? '…' : 'Delete spam'}
        </button>
      </div>
    </article>
  )
}

export default function CustomerReviewsInbox({ onUnauthorized }) {
  const [status, setStatus] = useState('pending')
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedTop, setCopiedTop] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminWebsiteReviews({ status })
      if (data?.unauthorized) {
        onUnauthorized?.(true)
        return
      }
      setReviews(Array.isArray(data.reviews) ? data.reviews : [])
    } catch (err) {
      setError(err?.message || 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }, [status, onUnauthorized])

  useEffect(() => {
    load()
  }, [load])

  function copyCustomerLink() {
    navigator.clipboard?.writeText(absoluteUrl('/review')).then(() => {
      setCopiedTop(true)
      setTimeout(() => setCopiedTop(false), 2000)
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-6">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">
          Website customer reviews
        </p>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-gray-600">
          These are reviews submitted on your website — not Google reviews. Pending reviews never appear
          publicly until you approve and publish them.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-royal btn-sm !rounded-xl" onClick={copyCustomerLink}>
            {copiedTop ? 'Copied' : 'Copy customer review link'}
          </button>
          <code className="rounded-lg bg-gray-50 px-3 py-2 text-[0.8125rem] text-navy-900 ring-1 ring-black/[0.06]">
            /review
          </code>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.value || 'all'}
            type="button"
            onClick={() => setStatus(item.value)}
            className={[
              'inline-flex min-h-11 items-center rounded-xl px-4 text-[0.8125rem] font-semibold',
              status === item.value
                ? 'bg-navy-900 text-white'
                : 'bg-white text-navy-900 ring-1 ring-black/[0.08] hover:bg-gray-50',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-sm text-gray-500" role="status">
          Loading reviews…
        </p>
      )}
      {error && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && reviews.length === 0 && (
        <p className="rounded-2xl border border-dashed border-black/[0.08] bg-white p-8 text-center text-sm text-gray-500">
          No {status || ''} reviews yet.
        </p>
      )}

      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onChanged={load}
            onUnauthorized={onUnauthorized}
          />
        ))}
      </div>
    </div>
  )
}
