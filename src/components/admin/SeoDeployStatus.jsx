import { useCallback, useEffect, useState } from 'react'
import { fetchAdminSeoDeployStatus } from '../../services/adminApi'

function formatWhen(iso) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Never'
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function stateLabel(state) {
  switch (String(state || 'idle')) {
    case 'queued':
      return 'SEO update queued'
    case 'failed':
      return 'SEO update failed'
    case 'success':
      return 'SEO update triggered'
    default:
      return 'No SEO update pending'
  }
}

function stateClass(state) {
  switch (String(state || 'idle')) {
    case 'queued':
      return 'bg-sky-50 text-sky-900 ring-sky-200'
    case 'failed':
      return 'bg-amber-50 text-amber-950 ring-amber-200'
    default:
      return 'bg-gray-50 text-gray-700 ring-black/[0.06]'
  }
}

/**
 * Admin-only SEO rebuild status from the Production deploy hook.
 * Never displays hook URLs or secrets.
 */
export default function SeoDeployStatus({
  seo = null,
  warning = '',
  onUnauthorized,
  refreshToken = 0,
}) {
  const [status, setStatus] = useState(seo)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    try {
      const next = await fetchAdminSeoDeployStatus()
      setStatus(next)
      setLoadError('')
    } catch (err) {
      if (err?.unauthorized) {
        onUnauthorized?.()
        return
      }
      setLoadError(err.message || 'Could not load SEO update status')
    }
  }, [onUnauthorized])

  useEffect(() => {
    load()
  }, [load, refreshToken])

  useEffect(() => {
    if (seo) setStatus(seo)
  }, [seo])

  const state = status?.state || 'idle'

  return (
    <div className="space-y-2">
      {warning ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-950" role="alert">
          {warning}
        </p>
      ) : null}

      <div className={`rounded-xl px-4 py-3 text-[0.8125rem] ring-1 ${stateClass(state)}`} role="status">
        <p className="font-semibold">{stateLabel(state)}</p>
        <p className="mt-1 text-[0.75rem] opacity-90">
          Last successful trigger: {formatWhen(status?.lastSuccessAt)}
        </p>
        {state === 'failed' && status?.lastError ? (
          <p className="mt-1 text-[0.75rem] opacity-90">Details: {status.lastError}</p>
        ) : null}
        {status && status.configured === false ? (
          <p className="mt-1 text-[0.75rem] opacity-90">
            Production deploy hook is not configured on the server yet.
          </p>
        ) : null}
        {loadError ? <p className="mt-1 text-[0.75rem] text-red-700">{loadError}</p> : null}
      </div>
    </div>
  )
}
