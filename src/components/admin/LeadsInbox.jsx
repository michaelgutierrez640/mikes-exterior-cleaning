import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchAdminLeads } from '../../services/adminApi'
import FollowUpBadge from './FollowUpBadge'
import {
  formatAppointmentDate,
  formatAppointmentTime,
  formatFollowUpDate,
  formatLeadDate,
  formatLeadSource,
  formatMoney,
  mailtoHref,
  telHref,
} from './leadHelpers'

const INBOX_VIEWS = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All' },
  { value: 'trash', label: 'Trash' },
]

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'instant_quote', label: 'Instant Quote' },
  { value: 'contact', label: 'Contact' },
  { value: 'booking', label: 'Booking' },
]

const FOLLOW_UP_FILTERS = [
  { value: '', label: 'All follow-ups' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'Due this week' },
  { value: 'none', label: 'No follow-up' },
]

const emptyFilters = {
  q: '',
  source: '',
  service: '',
  city: '',
  followUp: '',
  inboxView: 'active',
}

function SummaryCard({ label, value, tone = 'default', onClick, active }) {
  const tones = {
    default: 'border-black/[0.06] bg-white',
    danger: 'border-red-200 bg-red-50/50',
    warn: 'border-amber-200 bg-amber-50/50',
    info: 'border-sky-200 bg-sky-50/40',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-2xl border p-5 text-left shadow-[0_1px_3px_rgba(10,22,40,0.06)] transition',
        tones[tone] || tones.default,
        active ? 'ring-2 ring-royal-500' : 'hover:border-royal-200',
      ].join(' ')}
    >
      <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-navy-900">{value}</p>
    </button>
  )
}

function LeadRow({ lead }) {
  const phoneLink = telHref(lead.phone)
  const emailLink = mailtoHref(lead.email)
  return (
    <li>
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link to={`/admin/leads/${encodeURIComponent(lead.id)}`} className="min-w-0 flex-1 group">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-navy-900 group-hover:text-royal-700">{lead.name || '—'}</p>
            <span className="rounded-full bg-royal-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-royal-800">
              {lead.status}
            </span>
            <FollowUpBadge badge={lead.followUpBadge} />
          </div>
          <p className="mt-1 text-[0.8125rem] text-gray-500">
            {[lead.service || '—', lead.city || 'City unknown'].join(' · ')}
            {lead.quotedAmount != null ? ` · Quote ${formatMoney(lead.quotedAmount)}` : ''}
            {lead.completedRevenue != null ? ` · Revenue ${formatMoney(lead.completedRevenue)}` : ''}
            {lead.paymentStatus ? ` · ${lead.paymentStatus}` : ''}
          </p>
          <p className="mt-1 text-[0.75rem] text-gray-400">
            {formatLeadSource(lead.source)}
            {lead.appointmentDate
              ? ` · Appt ${formatAppointmentDate(lead.appointmentDate)} ${formatAppointmentTime(lead.appointmentStartTime)}`
              : ''}
            {lead.followUpDate ? ` · Follow-up ${formatFollowUpDate(lead.followUpDate)}` : ''}
            {lead.deletedAt ? ` · Trashed ${formatLeadDate(lead.deletedAt)}` : ''}
            {!lead.followUpDate && !lead.appointmentDate && !lead.deletedAt
              ? ` · ${formatLeadDate(lead.createdAt)}`
              : ''}
          </p>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {phoneLink && (
            <a href={phoneLink} className="btn-secondary btn-sm !rounded-xl !px-3 !py-2 text-[0.8125rem]">
              Call
            </a>
          )}
          {emailLink && (
            <a href={emailLink} className="btn-secondary btn-sm !rounded-xl !px-3 !py-2 text-[0.8125rem]">
              Email
            </a>
          )}
          <Link
            to={`/admin/leads/${encodeURIComponent(lead.id)}`}
            className="btn-royal btn-sm !rounded-xl !px-3 !py-2 text-[0.8125rem]"
          >
            Open
          </Link>
        </div>
      </div>
    </li>
  )
}

function LeadGroup({ title, leads, emptyLabel }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
      <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-3 sm:px-6">
        <p className="font-display text-base font-semibold text-navy-900">{title}</p>
        <p className="text-[0.75rem] text-gray-500">{leads.length}</p>
      </div>
      {!leads.length ? (
        <p className="px-5 py-6 text-[0.8125rem] text-gray-500 sm:px-6">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-black/[0.04]">
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Client-side partition that never drops leads (mirrors lib/leadsStore.partitionActiveInboxLeads).
 * Fixes: followUpBadge === 'completed' was previously omitted from every inbox group.
 */
function partitionActiveLeads(leads) {
  const overdue = []
  const dueToday = []
  const upcoming = []
  const other = []
  for (const lead of leads) {
    const badge = lead.followUpBadge
    if (badge === 'overdue') overdue.push(lead)
    else if (badge === 'today') dueToday.push(lead)
    else if (badge === 'upcoming') upcoming.push(lead)
    else other.push(lead)
  }
  return { overdue, dueToday, upcoming, other }
}

export default function LeadsInbox({ onUnauthorized }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialView = (() => {
    const v = String(searchParams.get('inboxView') || '').trim().toLowerCase()
    return ['active', 'completed', 'all', 'trash'].includes(v) ? v : 'active'
  })()
  const [filters, setFilters] = useState({ ...emptyFilters, inboxView: initialView })
  const [draft, setDraft] = useState({ ...emptyFilters, inboxView: initialView })
  const [leads, setLeads] = useState([])
  const [summary, setSummary] = useState({ overdue: 0, dueToday: 0, dueThisWeek: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminLeads(filters)
      if (data?.unauthorized) {
        onUnauthorized?.()
        return
      }
      setLeads(data.leads || [])
      setSummary(data.followUpSummary || { overdue: 0, dueToday: 0, dueThisWeek: 0 })
    } catch (err) {
      setError(err.message || 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [filters, onUnauthorized])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const v = String(searchParams.get('inboxView') || '').trim().toLowerCase()
    const nextView = ['active', 'completed', 'all', 'trash'].includes(v) ? v : 'active'
    setFilters((prev) => {
      if (prev.inboxView === nextView) return prev
      return { ...emptyFilters, inboxView: nextView }
    })
    setDraft((prev) => {
      if (prev.inboxView === nextView) return prev
      return { ...emptyFilters, inboxView: nextView }
    })
  }, [searchParams])
  function applyFilters(e) {
    e.preventDefault()
    setFilters({ ...draft })
  }

  function clearFilters() {
    const next = { ...emptyFilters, inboxView: filters.inboxView || 'active' }
    setDraft(next)
    setFilters(next)
  }

  function setInboxView(view) {
    const next = { ...draft, inboxView: view, followUp: '' }
    setDraft(next)
    setFilters(next)
    setSearchParams(view === 'active' ? {} : { inboxView: view })
  }

  function setFollowUpQuick(value) {
    const next = { ...draft, followUp: value, inboxView: 'active' }
    setDraft(next)
    setFilters(next)
    setSearchParams({})
  }

  const inboxView = filters.inboxView || 'active'
  const grouped = useMemo(() => partitionActiveLeads(leads), [leads])
  const showActiveBoard = inboxView === 'active' && !filters.followUp
  const hasFollowUpBuckets =
    grouped.overdue.length > 0 || grouped.dueToday.length > 0 || grouped.upcoming.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lead inbox views">
        {INBOX_VIEWS.map((view) => {
          const active = inboxView === view.value
          return (
            <button
              key={view.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setInboxView(view.value)}
              className={[
                'min-h-11 rounded-xl px-4 py-2.5 text-[0.875rem] font-semibold transition',
                active ? 'bg-royal-600 text-white shadow-sm' : 'bg-white text-navy-900 ring-1 ring-black/[0.08] hover:bg-gray-50',
              ].join(' ')}
            >
              {view.label}
            </button>
          )
        })}
      </div>
      <p className="text-[0.8125rem] text-gray-500">
        {inboxView === 'active' && 'Active shows New, Contacted, and Booked leads.'}
        {inboxView === 'completed' && 'Completed shows every completed job lead. Nothing is deleted.'}
        {inboxView === 'all' && 'All shows every live lead, including Completed and Lost (not Trash).'}
        {inboxView === 'trash' &&
          'Trash shows soft-deleted leads. Restore them or permanently delete them from the lead page.'}
      </p>

      {inboxView === 'active' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Overdue follow-ups"
            value={summary.overdue ?? 0}
            tone="danger"
            active={filters.followUp === 'overdue'}
            onClick={() => setFollowUpQuick(filters.followUp === 'overdue' ? '' : 'overdue')}
          />
          <SummaryCard
            label="Due today"
            value={summary.dueToday ?? 0}
            tone="warn"
            active={filters.followUp === 'today'}
            onClick={() => setFollowUpQuick(filters.followUp === 'today' ? '' : 'today')}
          />
          <SummaryCard
            label="Due this week"
            value={summary.dueThisWeek ?? 0}
            tone="info"
            active={filters.followUp === 'week'}
            onClick={() => setFollowUpQuick(filters.followUp === 'week' ? '' : 'week')}
          />
        </div>
      )}

      <form
        onSubmit={applyFilters}
        className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-6"
      >
        <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">Search this view</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor="lead-q" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
              Name, phone, or email
            </label>
            <input
              id="lead-q"
              type="search"
              value={draft.q}
              onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              className="input-light"
              placeholder={
                inboxView === 'completed'
                  ? 'Search completed leads…'
                  : inboxView === 'all'
                    ? 'Search all live leads…'
                    : inboxView === 'trash'
                      ? 'Search trashed leads…'
                      : 'Search active leads…'
              }
            />
          </div>
          {inboxView === 'active' && (
            <div>
              <label htmlFor="lead-followup" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
                Follow-up
              </label>
              <select
                id="lead-followup"
                value={draft.followUp}
                onChange={(e) => setDraft((d) => ({ ...d, followUp: e.target.value }))}
                className="input-light"
              >
                {FOLLOW_UP_FILTERS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="lead-source" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
              Source
            </label>
            <select
              id="lead-source"
              value={draft.source}
              onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
              className="input-light"
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lead-service" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
              Service
            </label>
            <input
              id="lead-service"
              type="text"
              value={draft.service}
              onChange={(e) => setDraft((d) => ({ ...d, service: e.target.value }))}
              className="input-light"
              placeholder="e.g. Window"
            />
          </div>
          <div>
            <label htmlFor="lead-city" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
              City
            </label>
            <input
              id="lead-city"
              type="text"
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              className="input-light"
              placeholder="e.g. Modesto"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="btn-royal btn-md !rounded-xl">
            Search
          </button>
          <button type="button" onClick={clearFilters} className="btn-secondary btn-md !rounded-xl">
            Clear
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-black/[0.06] bg-white px-5 py-12 text-center text-[0.875rem] text-gray-500 shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
          Loading leads…
        </div>
      ) : showActiveBoard ? (
        <div className="space-y-4">
          {hasFollowUpBuckets ? (
            <>
              <div>
                <h2 className="font-display text-xl font-semibold text-navy-900">Follow-Up</h2>
                <p className="mt-1 text-[0.8125rem] text-gray-500">
                  Overdue first, then today, then upcoming. Other active leads are listed below.
                </p>
              </div>
              {grouped.overdue.length > 0 && (
                <LeadGroup title="Overdue" leads={grouped.overdue} emptyLabel="No overdue follow-ups." />
              )}
              {grouped.dueToday.length > 0 && (
                <LeadGroup title="Due Today" leads={grouped.dueToday} emptyLabel="Nothing due today." />
              )}
              {grouped.upcoming.length > 0 && (
                <LeadGroup title="Upcoming" leads={grouped.upcoming} emptyLabel="No upcoming follow-ups." />
              )}
            </>
          ) : null}
          <LeadGroup
            title={hasFollowUpBuckets ? 'Other active leads' : 'Active leads'}
            leads={grouped.other}
            emptyLabel="No active leads (New, Contacted, or Booked) yet."
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 sm:px-6">
            <p className="font-display text-lg font-semibold text-navy-900">
              {inboxView === 'completed'
                ? 'Completed leads'
                : inboxView === 'all'
                  ? 'All leads'
                  : inboxView === 'trash'
                    ? 'Trash'
                    : 'Filtered leads'}
            </p>
            <p className="text-[0.8125rem] text-gray-500">
              {`${leads.length} lead${leads.length === 1 ? '' : 's'}`}
            </p>
          </div>
          {!leads.length ? (
            <div className="px-5 py-12 text-center text-[0.875rem] text-gray-500 sm:px-6">
              {inboxView === 'completed'
                ? 'No completed leads match this search.'
                : inboxView === 'trash'
                  ? 'Trash is empty.'
                  : 'No leads match these filters yet.'}
            </div>
          ) : (
            <ul className="divide-y divide-black/[0.04]">
              {leads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
