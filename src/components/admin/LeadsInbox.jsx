import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminLeads } from '../../services/adminApi'
import FollowUpBadge from './FollowUpBadge'
import {
  LEAD_STATUSES,
  formatFollowUpDate,
  formatLeadDate,
  formatLeadSource,
  mailtoHref,
  telHref,
} from './leadHelpers'

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
  status: '',
  source: '',
  service: '',
  city: '',
  followUp: '',
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
            <FollowUpBadge badge={lead.followUpBadge} />
          </div>
          <p className="mt-1 text-[0.8125rem] text-gray-500">
            {[lead.service || '—', lead.city || 'City unknown'].join(' · ')}
          </p>
          <p className="mt-1 text-[0.75rem] text-gray-400">
            {formatLeadSource(lead.source)} · {lead.status}
            {lead.followUpDate ? ` · Follow-up ${formatFollowUpDate(lead.followUpDate)}` : ''}
            {!lead.followUpDate ? ` · ${formatLeadDate(lead.createdAt)}` : ''}
          </p>
          {lead.followUpNote && (
            <p className="mt-1 line-clamp-1 text-[0.75rem] text-gray-500">{lead.followUpNote}</p>
          )}
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

function FollowUpGroup({ title, leads, emptyLabel }) {
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

export default function LeadsInbox({ onUnauthorized }) {
  const [filters, setFilters] = useState(emptyFilters)
  const [draft, setDraft] = useState(emptyFilters)
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

  function applyFilters(e) {
    e.preventDefault()
    setFilters({ ...draft })
  }

  function clearFilters() {
    setDraft(emptyFilters)
    setFilters(emptyFilters)
  }

  function setFollowUpQuick(value) {
    const next = { ...draft, followUp: value }
    setDraft(next)
    setFilters(next)
  }

  const grouped = useMemo(() => {
    const overdue = []
    const today = []
    const upcoming = []
    const none = []
    for (const lead of leads) {
      if (lead.followUpBadge === 'overdue') overdue.push(lead)
      else if (lead.followUpBadge === 'today') today.push(lead)
      else if (lead.followUpBadge === 'upcoming') upcoming.push(lead)
      else if (lead.followUpBadge === 'none') none.push(lead)
    }
    const byDate = (a, b) => String(a.followUpDate || '').localeCompare(String(b.followUpDate || ''))
    overdue.sort(byDate)
    today.sort(byDate)
    upcoming.sort(byDate)
    return { overdue, today, upcoming, none }
  }, [leads])

  const showFollowUpBoard = !filters.followUp || ['overdue', 'today', 'week', 'upcoming', 'none'].includes(filters.followUp)

  return (
    <div className="space-y-6">
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

      <form
        onSubmit={applyFilters}
        className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-6"
      >
        <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">Search & filters</p>
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
              placeholder="Search leads…"
            />
          </div>
          <div>
            <label htmlFor="lead-status" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
              Status
            </label>
            <select
              id="lead-status"
              value={draft.status}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
              className="input-light"
            >
              <option value="">All statuses</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
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
            Apply filters
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
      ) : showFollowUpBoard && !filters.followUp ? (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-navy-900">Follow-Up</h2>
            <p className="mt-1 text-[0.8125rem] text-gray-500">
              Sorted by urgency — overdue first, then today, then upcoming.
            </p>
          </div>
          <FollowUpGroup title="Overdue" leads={grouped.overdue} emptyLabel="No overdue follow-ups." />
          <FollowUpGroup title="Due Today" leads={grouped.today} emptyLabel="Nothing due today." />
          <FollowUpGroup title="Upcoming" leads={grouped.upcoming} emptyLabel="No upcoming follow-ups." />
          <FollowUpGroup title="No Follow-Up Set" leads={grouped.none} emptyLabel="Every lead has a follow-up set." />
        </div>
      ) : (
        <div className="rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 sm:px-6">
            <p className="font-display text-lg font-semibold text-navy-900">
              {filters.followUp ? 'Filtered leads' : 'Inbox'}
            </p>
            <p className="text-[0.8125rem] text-gray-500">
              {`${leads.length} lead${leads.length === 1 ? '' : 's'}`}
            </p>
          </div>
          {!leads.length ? (
            <div className="px-5 py-12 text-center text-[0.875rem] text-gray-500 sm:px-6">
              No leads match these filters yet.
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
