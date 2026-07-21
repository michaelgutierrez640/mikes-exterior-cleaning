import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminLead, updateAdminLead } from '../../services/adminApi'
import FollowUpBadge from './FollowUpBadge'
import {
  LEAD_STATUSES,
  formatFollowUpDate,
  formatLeadDate,
  formatLeadSource,
  mailtoHref,
  telHref,
} from './leadHelpers'

function todayPacificKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getFollowUpBadgeClient(lead) {
  if (!lead) return 'none'
  if (lead.followUpDate) {
    const today = todayPacificKey()
    if (lead.followUpDate < today) return 'overdue'
    if (lead.followUpDate === today) return 'today'
    return 'upcoming'
  }
  if (lead.followUpCompletedAt) return 'completed'
  return 'none'
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">{label}</p>
      <div className="mt-1.5 text-[0.9375rem] text-navy-900">{children || '—'}</div>
    </div>
  )
}

export default function LeadDetailPanel({ leadId, onUnauthorized }) {
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [statusDraft, setStatusDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [followUpDateDraft, setFollowUpDateDraft] = useState('')
  const [followUpNoteDraft, setFollowUpNoteDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminLead(leadId)
      if (data?.unauthorized) {
        onUnauthorized?.()
        return
      }
      setLead(data.lead)
      setStatusDraft(data.lead?.status || 'New Lead')
      setFollowUpDateDraft(data.lead?.followUpDate || '')
      setFollowUpNoteDraft(data.lead?.followUpNote || '')
    } catch (err) {
      setError(err.message || 'Failed to load lead')
      setLead(null)
    } finally {
      setLoading(false)
    }
  }, [leadId, onUnauthorized])

  useEffect(() => {
    load()
  }, [load])

  async function handleStatusSave(e) {
    e.preventDefault()
    if (!lead || statusDraft === lead.status) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const updated = await updateAdminLead(lead.id, { status: statusDraft })
      setLead(updated)
      setFollowUpDateDraft(updated.followUpDate || '')
      setFollowUpNoteDraft(updated.followUpNote || '')
      setMessage(
        ['Completed', 'Lost'].includes(statusDraft) && !updated.followUpDate
          ? 'Status updated. Active follow-up reminder cleared.'
          : 'Status updated.',
      )
    } catch (err) {
      if (err.unauthorized) {
        onUnauthorized?.()
        return
      }
      setError(err.message || 'Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddNote(e) {
    e.preventDefault()
    const text = noteDraft.trim()
    if (!lead || !text) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const updated = await updateAdminLead(lead.id, { note: text })
      setLead(updated)
      setNoteDraft('')
      setMessage('Note added.')
    } catch (err) {
      if (err.unauthorized) {
        onUnauthorized?.()
        return
      }
      setError(err.message || 'Failed to add note')
    } finally {
      setSaving(false)
    }
  }

  async function handleFollowUpSave(e) {
    e.preventDefault()
    if (!lead) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const updated = await updateAdminLead(lead.id, {
        followUpDate: followUpDateDraft || null,
        followUpNote: followUpNoteDraft,
      })
      setLead(updated)
      setFollowUpDateDraft(updated.followUpDate || '')
      setFollowUpNoteDraft(updated.followUpNote || '')
      setMessage(updated.followUpDate ? 'Follow-up saved.' : 'Follow-up date cleared.')
    } catch (err) {
      if (err.unauthorized) {
        onUnauthorized?.()
        return
      }
      setError(err.message || 'Failed to save follow-up')
    } finally {
      setSaving(false)
    }
  }

  async function handleFollowUpClear() {
    if (!lead) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const updated = await updateAdminLead(lead.id, { clearFollowUp: true })
      setLead(updated)
      setFollowUpDateDraft('')
      setFollowUpNoteDraft('')
      setMessage('Follow-up cleared.')
    } catch (err) {
      if (err.unauthorized) {
        onUnauthorized?.()
        return
      }
      setError(err.message || 'Failed to clear follow-up')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center text-[0.875rem] text-gray-500 shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
        Loading lead…
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-white p-8 shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
        <p className="text-[0.875rem] text-red-700">{error || 'Lead not found.'}</p>
        <Link to="/admin/leads" className="mt-4 inline-block text-[0.875rem] font-semibold text-royal-700 hover:text-royal-800">
          ← Back to inbox
        </Link>
      </div>
    )
  }

  const phoneLink = telHref(lead.phone)
  const emailLink = mailtoHref(lead.email)
  const notes = Array.isArray(lead.notes) ? [...lead.notes].reverse() : []
  const history = Array.isArray(lead.statusHistory) ? [...lead.statusHistory].reverse() : []
  const followUpBadge = getFollowUpBadgeClient(lead)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/leads" className="text-[0.875rem] font-semibold text-royal-700 hover:text-royal-800">
          ← Back to inbox
        </Link>
        <div className="flex flex-wrap gap-2">
          {phoneLink && (
            <a href={phoneLink} className="btn-secondary btn-md !rounded-xl">
              Call {lead.phone}
            </a>
          )}
          {emailLink && (
            <a href={emailLink} className="btn-secondary btn-md !rounded-xl">
              Email
            </a>
          )}
        </div>
      </div>

      {message && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-[0.875rem] text-emerald-800" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-navy-900">{lead.name}</h2>
            <p className="mt-1 text-[0.875rem] text-gray-500">
              {formatLeadSource(lead.source)} · Submitted {formatLeadDate(lead.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-royal-50 px-3 py-1 text-[0.75rem] font-semibold text-royal-800">
              {lead.status}
            </span>
            <FollowUpBadge badge={followUpBadge} />
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Field label="Phone">{lead.phone}</Field>
          <Field label="Email">{lead.email}</Field>
          <Field label="Service">{lead.service}</Field>
          <Field label="City">{lead.city || '—'}</Field>
          <Field label="Address">{lead.address}</Field>
          <Field label="Source">{formatLeadSource(lead.source)}</Field>
        </div>

        <div className="mt-8">
          <Field label="Customer message">
            <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-gray-700">
              {lead.message || '—'}
            </p>
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-7">
        <h3 className="font-display text-lg font-semibold text-navy-900">Attribution</h3>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Field label="Original landing page">
            <span className="break-all font-mono text-[0.8125rem]">{lead.originalLandingPage || '—'}</span>
          </Field>
          <Field label="Conversion page">
            <span className="break-all font-mono text-[0.8125rem]">{lead.conversionPage || '—'}</span>
          </Field>
          <Field label="Referrer">
            <span className="break-all font-mono text-[0.8125rem]">{lead.referrer || '—'}</span>
          </Field>
          <Field label="UTM source">{lead.utmSource}</Field>
          <Field label="UTM medium">{lead.utmMedium}</Field>
          <Field label="UTM campaign">{lead.utmCampaign}</Field>
          <Field label="UTM term">{lead.utmTerm}</Field>
          <Field label="UTM content">{lead.utmContent}</Field>
        </div>
      </div>

      <form
        onSubmit={handleFollowUpSave}
        className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-navy-900">Follow-up reminder</h3>
            <p className="mt-1 text-[0.8125rem] text-gray-500">
              Admin-only reminder — no email or SMS is sent.
            </p>
          </div>
          <FollowUpBadge badge={followUpBadge} />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="follow-up-date" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
              Follow-up date
            </label>
            <input
              id="follow-up-date"
              type="date"
              value={followUpDateDraft}
              onChange={(e) => setFollowUpDateDraft(e.target.value)}
              className="input-light"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="follow-up-note" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
              Follow-up note (optional)
            </label>
            <textarea
              id="follow-up-note"
              rows={3}
              value={followUpNoteDraft}
              onChange={(e) => setFollowUpNoteDraft(e.target.value)}
              className="input-light resize-none"
              placeholder="Call back about estimate, confirm appointment…"
            />
          </div>
        </div>
        {(lead.followUpDate || lead.followUpCompletedAt) && (
          <p className="mt-3 text-[0.75rem] text-gray-400">
            {lead.followUpDate
              ? `Scheduled for ${formatFollowUpDate(lead.followUpDate)}`
              : `Reminder completed ${formatLeadDate(lead.followUpCompletedAt)}`}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-royal btn-md !rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save follow-up'}
          </button>
          <button
            type="button"
            onClick={handleFollowUpClear}
            disabled={saving || (!lead.followUpDate && !lead.followUpNote)}
            className="btn-secondary btn-md !rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear follow-up
          </button>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleStatusSave}
          className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-7"
        >
          <h3 className="font-display text-lg font-semibold text-navy-900">Update status</h3>
          <label htmlFor="lead-status-edit" className="mt-4 mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
            Pipeline status
          </label>
          <select
            id="lead-status-edit"
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value)}
            className="input-light"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving || statusDraft === lead.status}
            className="btn-royal btn-md mt-4 !rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save status'}
          </button>
        </form>

        <form
          onSubmit={handleAddNote}
          className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-7"
        >
          <h3 className="font-display text-lg font-semibold text-navy-900">Add private note</h3>
          <label htmlFor="lead-note" className="mt-4 mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
            Note
          </label>
          <textarea
            id="lead-note"
            rows={4}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            className="input-light resize-none"
            placeholder="Call notes, estimate details, follow-up plans…"
          />
          <button
            type="submit"
            disabled={saving || !noteDraft.trim()}
            className="btn-royal btn-md mt-4 !rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add note'}
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-7">
          <h3 className="font-display text-lg font-semibold text-navy-900">Notes</h3>
          {!notes.length ? (
            <p className="mt-4 text-[0.875rem] text-gray-500">No notes yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="whitespace-pre-wrap text-[0.875rem] text-gray-700">{n.text}</p>
                  <p className="mt-2 text-[0.75rem] text-gray-400">{formatLeadDate(n.at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-7">
          <h3 className="font-display text-lg font-semibold text-navy-900">Status history</h3>
          {!history.length ? (
            <p className="mt-4 text-[0.875rem] text-gray-500">No history yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {history.map((h, idx) => (
                <li key={`${h.at}-${h.status}-${idx}`} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-royal-500" aria-hidden />
                  <div>
                    <p className="text-[0.875rem] font-medium text-navy-900">{h.status}</p>
                    <p className="text-[0.75rem] text-gray-400">
                      {formatLeadDate(h.at)}
                      {h.by ? ` · ${h.by}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <p className="text-[0.75rem] text-gray-400">
        Lead ID <span className="font-mono">{lead.id}</span> · Updated {formatLeadDate(lead.updatedAt)}
      </p>
    </div>
  )
}
