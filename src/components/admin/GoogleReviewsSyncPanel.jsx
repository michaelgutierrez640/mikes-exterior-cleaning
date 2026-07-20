import { useState } from 'react'
import { syncGoogleReviews } from '../../services/adminApi'

/**
 * Private admin control to pull Google Business Profile reviews into Redis.
 * Uses admin session cookie — never embeds REVIEWS_SYNC_SECRET or OAuth secrets.
 */
export default function GoogleReviewsSyncPanel({ onUnauthorized }) {
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lastResult, setLastResult] = useState(null)

  async function handleSync() {
    setStatus('syncing')
    setMessage('')
    setError('')
    try {
      const result = await syncGoogleReviews()
      setLastResult(result)
      setMessage(
        `Synced ${result.storedReviews ?? 0} reviews · average ${
          result.rating != null ? Number(result.rating).toFixed(1) : '—'
        } · total ${result.reviewCount ?? '—'}`,
      )
      setStatus('done')
    } catch (err) {
      if (err.unauthorized) {
        onUnauthorized?.()
        return
      }
      setError(err.message || 'Sync failed')
      setStatus('error')
    }
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">Google Reviews</p>
          <h2 className="font-display mt-2 text-lg font-semibold text-navy-900">Sync Google Reviews</h2>
          <p className="mt-2 max-w-xl text-[0.875rem] leading-relaxed text-gray-500">
            Pull the latest reviews from your verified Google Business Profile into Redis. The homepage review
            section updates from this cache. Scheduled sync also runs once per day on Vercel Hobby.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={status === 'syncing'}
          className="btn-royal btn-md !rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'syncing' ? 'Syncing…' : 'Sync Google Reviews'}
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-[0.875rem] text-emerald-800" role="status">
          {message}
          {lastResult?.syncedAt && (
            <span className="mt-1 block text-[0.75rem] text-emerald-700/80">
              {new Date(lastResult.syncedAt).toLocaleString()}
            </span>
          )}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
