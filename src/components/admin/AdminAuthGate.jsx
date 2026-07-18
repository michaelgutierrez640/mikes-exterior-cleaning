import { useEffect, useState } from 'react'
import { adminLogin, adminLogout, fetchAdminSession, fetchDashboardMetrics } from '../../services/adminApi'

/**
 * Shared admin gate: password login, then render children.
 * Session check does not require Redis — Completed Jobs stays available if analytics fails.
 */
export default function AdminAuthGate({ children }) {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('loading') // loading | unauth | ready
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState(null)
  const [metricsError, setMetricsError] = useState('')

  async function loadMetrics() {
    setMetricsError('')
    try {
      const data = await fetchDashboardMetrics()
      if (data?.unauthorized) {
        setStatus('unauth')
        setMetrics(null)
        return
      }
      setMetrics(data)
    } catch (e) {
      setMetrics(null)
      setMetricsError(e.message || 'Analytics unavailable')
    }
  }

  async function refreshAuth() {
    setError('')
    setStatus('loading')
    try {
      const session = await fetchAdminSession()
      if (session?.unauthorized) {
        setStatus('unauth')
        setMetrics(null)
        return
      }
      setStatus('ready')
      await loadMetrics()
    } catch (e) {
      setStatus('unauth')
      setError(e.message || 'Failed to verify session')
    }
  }

  useEffect(() => {
    refreshAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function signOut() {
    await adminLogout()
    setMetrics(null)
    setMetricsError('')
    setStatus('unauth')
  }

  if (status === 'loading') {
    return (
      <div
        className="mx-auto max-w-2xl rounded-2xl border border-black/[0.06] bg-white p-7 text-center shadow-[0_1px_3px_rgba(10,22,40,0.06)]"
        role="status"
        aria-live="polite"
      >
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-royal-200 border-t-royal-600" />
        <p className="mt-4 text-[0.875rem] text-gray-600">Loading admin…</p>
      </div>
    )
  }

  if (status === 'unauth') {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-black/[0.06] bg-white p-7 shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
        <h2 className="font-display text-xl font-semibold text-navy-900">Sign in</h2>
        <p className="mt-2 text-[0.875rem] text-gray-500">
          Enter the admin password (Vercel env: <span className="font-mono">ADMIN_DASHBOARD_PASSWORD</span>).
        </p>
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700" role="alert">
            {error}
          </p>
        )}
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            try {
              await adminLogin(password)
              setPassword('')
              await refreshAuth()
            } catch (err) {
              setError(err.message || 'Login failed')
            }
          }}
        >
          <div>
            <label className="mb-2 block text-[0.8125rem] font-medium text-gray-600" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-light"
              autoComplete="current-password"
              placeholder="Enter password"
            />
          </div>
          <button className="btn-royal btn-md w-full !rounded-xl" type="submit">
            Sign in
          </button>
        </form>
      </div>
    )
  }

  return children({
    metrics,
    metricsError,
    refreshMetrics: loadMetrics,
    signOut,
    setUnauthorized: () => {
      setMetrics(null)
      setStatus('unauth')
    },
  })
}
