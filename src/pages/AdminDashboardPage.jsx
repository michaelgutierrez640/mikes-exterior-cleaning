import { useEffect, useMemo, useState } from 'react'
import CompletedJobsPanel from '../components/admin/CompletedJobsPanel'
import SeoHead from '../components/seo/SeoHead'
import { absoluteUrl } from '../config/site'
import { adminLogin, adminLogout, fetchDashboardMetrics } from '../services/adminApi'

function formatPct(value) {
  if (!Number.isFinite(value)) return '—'
  return `${Math.round(value * 1000) / 10}%`
}

function formatCurrency(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-navy-900 sm:text-3xl">{value}</p>
      {sub && <p className="mt-2 text-[0.8125rem] text-gray-500">{sub}</p>}
    </div>
  )
}

function MiniTable({ title, rows, columns }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
      <div className="flex items-center justify-between gap-4">
        <p className="font-display text-lg font-semibold text-navy-900">{title}</p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left">
          <thead>
            <tr className="border-b border-black/[0.06]">
              {columns.map((c) => (
                <th key={c.key} className="py-2 pr-4 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b border-black/[0.04] last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className="py-2 pr-4 text-[0.875rem] text-gray-600">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length} className="py-6 text-center text-[0.875rem] text-gray-500">
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AnalyticsPanel({ metrics, onRefresh, onSignOut }) {
  const traffic = metrics?.traffic
  const leads = metrics?.leads
  const conversions = metrics?.conversions
  const business = metrics?.business
  const attribution = metrics?.attribution
  const topSources = useMemo(() => traffic?.topSources ?? [], [traffic])
  const topPages = useMemo(() => traffic?.topPages ?? [], [traffic])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-gray-500">
          Updated: <span className="font-medium text-gray-700">{new Date(metrics.generatedAt).toLocaleString()}</span>
        </p>
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm !rounded-xl" onClick={onRefresh}>
            Refresh
          </button>
          <button className="btn-ghost btn-sm !rounded-xl" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total visitors" value={traffic?.totalVisitors ?? 0} />
        <StatCard label="Visitors today" value={traffic?.visitorsToday ?? 0} />
        <StatCard label="This week" value={traffic?.visitorsWeek ?? 0} />
        <StatCard label="This month" value={traffic?.visitorsMonth ?? 0} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total page views" value={traffic?.pageViewsTotal ?? 0} />
        <StatCard label="Page views today" value={traffic?.pageViewsToday ?? 0} />
        <StatCard label="Page views this week" value={traffic?.pageViewsWeek ?? 0} />
        <StatCard label="Page views this month" value={traffic?.pageViewsMonth ?? 0} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Quote starts" value={leads?.instant_quote_started ?? 0} />
        <StatCard label="Quote completions" value={leads?.instant_quote_completed ?? 0} />
        <StatCard label="Booking requests" value={leads?.booking_requested ?? 0} />
        <StatCard label="Contact submissions" value={leads?.contact_form_submitted ?? 0} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Visitor → quote start" value={formatPct(conversions?.quoteStartRate)} />
        <StatCard label="Quote start → complete" value={formatPct(conversions?.quoteCompletionRate)} />
        <StatCard label="Quote → booking" value={formatPct(conversions?.quoteToBookingRate)} />
        <StatCard label="Overall lead conversion" value={formatPct(conversions?.overallLeadConversionRate)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Total estimated quote value"
          value={formatCurrency(business?.totalQuoteValue ?? 0)}
          sub="Sum of low-end estimate values for quote completions."
        />
        <StatCard label="Average quote value" value={formatCurrency(business?.avgQuoteValue ?? 0)} />
        <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">Most requested</p>
          <div className="mt-4 grid gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[0.875rem] text-gray-600">Service</span>
              <span className="font-medium text-navy-900">
                {business?.mostRequestedService?.key ?? '—'}
                {business?.mostRequestedService ? ` (${business.mostRequestedService.count})` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.875rem] text-gray-600">City</span>
              <span className="font-medium text-navy-900">
                {business?.mostRequestedCity?.key ?? '—'}
                {business?.mostRequestedCity ? ` (${business.mostRequestedCity.count})` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MiniTable
          title="Top traffic sources"
          rows={topSources}
          columns={[
            { key: 'key', label: 'Source' },
            { key: 'count', label: 'Pageviews' },
          ]}
        />
        <MiniTable
          title="Top pages viewed"
          rows={topPages}
          columns={[
            { key: 'key', label: 'Page' },
            { key: 'count', label: 'Views' },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MiniTable
          title="Top lead sources"
          rows={attribution?.topLeadSources ?? []}
          columns={[
            { key: 'key', label: 'Source' },
            { key: 'count', label: 'Leads' },
          ]}
        />
        <MiniTable
          title="Device type"
          rows={Object.entries(traffic?.deviceCounts ?? {}).map(([key, count]) => ({ key, count }))}
          columns={[
            { key: 'key', label: 'Device' },
            { key: 'count', label: 'Pageviews' },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MiniTable
          title="Recent quote submissions"
          rows={(business?.recentQuotes ?? []).map((e) => ({
            at: e.at,
            path: e.path || '—',
            value: e.quoteValueLow,
            service: e.service || '—',
            city: e.city || '—',
          }))}
          columns={[
            { key: 'at', label: 'Time', render: (r) => new Date(r.at).toLocaleString() },
            { key: 'value', label: 'Value', render: (r) => formatCurrency(r.value) },
            { key: 'service', label: 'Service' },
            { key: 'city', label: 'City' },
          ]}
        />
        <MiniTable
          title="Recent booking requests"
          rows={(business?.recentBookings ?? []).map((e) => ({
            at: e.at,
            path: e.path || '—',
            service: e.service || '—',
            city: e.city || '—',
          }))}
          columns={[
            { key: 'at', label: 'Time', render: (r) => new Date(r.at).toLocaleString() },
            { key: 'service', label: 'Service' },
            { key: 'city', label: 'City' },
          ]}
        />
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('loading') // loading | unauth | ready | error
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState(null)
  const [section, setSection] = useState('analytics') // analytics | jobs

  async function refresh() {
    setError('')
    setStatus('loading')
    const data = await fetchDashboardMetrics()
    if (data?.unauthorized) {
      setStatus('unauth')
      setMetrics(null)
      return
    }
    setMetrics(data)
    setStatus('ready')
  }

  useEffect(() => {
    refresh().catch((e) => {
      setStatus('error')
      setError(e.message || 'Failed to load dashboard')
    })
  }, [])

  async function signOut() {
    await adminLogout()
    setMetrics(null)
    setStatus('unauth')
    setSection('analytics')
  }

  return (
    <>
      <SeoHead
        title="Admin Dashboard | Mike's Exterior"
        description="Private analytics and completed-jobs dashboard for Mike's Exterior Cleaning Services."
        canonical={absoluteUrl('/admin/dashboard')}
        noindex
      />

      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-14 sm:pt-32 sm:pb-16">
        <div className="section-container">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">Private</p>
          <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">Admin Dashboard</h1>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-[1.7] text-white/60">
            Analytics stay in Upstash Redis. Completed job photos use Vercel Blob; job records stay in Redis (URLs + metadata only).
          </p>
        </div>
      </section>

      <section className="section-container -mt-10 pb-20">
        {status === 'unauth' && (
          <div className="mx-auto max-w-lg rounded-2xl border border-black/[0.06] bg-white p-7 shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
            <h2 className="font-display text-xl font-semibold text-navy-900">Sign in</h2>
            <p className="mt-2 text-[0.875rem] text-gray-500">
              Enter the admin password (stored only in Vercel env: <span className="font-mono">ADMIN_DASHBOARD_PASSWORD</span>).
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
                  await refresh()
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
        )}

        {status === 'error' && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-black/[0.06] bg-white p-7 shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
            <h2 className="font-display text-xl font-semibold text-navy-900">Dashboard error</h2>
            <p className="mt-2 text-[0.875rem] text-gray-600">{error || 'Something went wrong.'}</p>
            <button className="btn-secondary btn-sm mt-5 !rounded-xl" onClick={() => refresh()}>
              Retry
            </button>
          </div>
        )}

        {status === 'ready' && metrics && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav className="flex flex-wrap gap-2" aria-label="Admin sections">
                <button
                  type="button"
                  className={`rounded-xl px-4 py-2 text-[0.875rem] font-semibold transition ${
                    section === 'analytics' ? 'bg-navy-900 text-white' : 'bg-white text-navy-900 ring-1 ring-black/[0.06]'
                  }`}
                  onClick={() => setSection('analytics')}
                >
                  Analytics
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-4 py-2 text-[0.875rem] font-semibold transition ${
                    section === 'jobs' ? 'bg-navy-900 text-white' : 'bg-white text-navy-900 ring-1 ring-black/[0.06]'
                  }`}
                  onClick={() => setSection('jobs')}
                >
                  Completed Jobs
                </button>
              </nav>
              {section === 'jobs' && (
                <button className="btn-ghost btn-sm !rounded-xl" onClick={signOut}>
                  Sign out
                </button>
              )}
            </div>

            {section === 'analytics' ? (
              <AnalyticsPanel metrics={metrics} onRefresh={() => refresh()} onSignOut={signOut} />
            ) : (
              <CompletedJobsPanel
                onUnauthorized={() => {
                  setMetrics(null)
                  setStatus('unauth')
                }}
              />
            )}
          </div>
        )}

        {status === 'loading' && (
          <div
            className="mx-auto max-w-2xl rounded-2xl border border-black/[0.06] bg-white p-7 text-center shadow-[0_1px_3px_rgba(10,22,40,0.06)]"
            role="status"
            aria-live="polite"
          >
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-royal-200 border-t-royal-600" />
            <p className="mt-4 text-[0.875rem] text-gray-600">Loading dashboard…</p>
          </div>
        )}
      </section>
    </>
  )
}
