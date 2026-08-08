import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminLead, updateAdminLead } from '../../services/adminApi'
import FollowUpBadge from './FollowUpBadge'
import {
  LEAD_STATUSES,
  PAYMENT_STATUSES,
  formatAppointmentDate,
  formatAppointmentTime,
  formatFollowUpDate,
  formatLeadDate,
  formatLeadSource,
  formatMoney,
  mailtoHref,
  moneyInputValue,
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

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-500 uppercase">{label}</p>
      <div className="mt-1 text-[0.9375rem] text-navy-900">{children || '—'}</div>
    </div>
  )
}

function Section({ title, children, hint }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-5">
      <h3 className="font-display text-base font-semibold text-navy-900 sm:text-lg">{title}</h3>
      {hint ? <p className="mt-1 text-[0.75rem] leading-snug text-gray-500">{hint}</p> : null}
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  )
}

function emptyDetailsDraft() {
  return {
    status: 'New',
    appointmentDate: '',
    appointmentStartTime: '',
    appointmentNotes: '',
    quotedAmount: '',
    bookedAmount: '',
    completedRevenue: '',
    paymentStatus: '',
    internalNotes: '',
    lostReason: '',
    followUpDate: '',
    followUpNote: '',
  }
}

function draftFromLead(lead) {
  if (!lead) return emptyDetailsDraft()
  return {
    status: lead.status || 'New',
    appointmentDate: lead.appointmentDate || '',
    appointmentStartTime: lead.appointmentStartTime || '',
    appointmentNotes: lead.appointmentNotes || '',
    quotedAmount: moneyInputValue(lead.quotedAmount),
    bookedAmount: moneyInputValue(lead.bookedAmount),
    completedRevenue: moneyInputValue(lead.completedRevenue),
    paymentStatus: lead.paymentStatus || '',
    internalNotes: lead.internalNotes || '',
    lostReason: lead.lostReason || '',
    followUpDate: lead.followUpDate || '',
    followUpNote: lead.followUpNote || '',
  }
}

function moneyOrNull(value) {
  const s = String(value ?? '').trim()
  if (!s) return null
  return s
}

export default function LeadDetailPanel({ leadId, onUnauthorized }) {
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [detailsDraft, setDetailsDraft] = useState(emptyDetailsDraft())
  const [saving, setSaving] = useState(false)
  const [bookedConfirmOpen, setBookedConfirmOpen] = useState(false)

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
      setDetailsDraft(draftFromLead(data.lead))
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

  const updateDetail = (field, value) => {
    setDetailsDraft((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'status' && value === 'Booked' && !prev.paymentStatus) {
        next.paymentStatus = 'unpaid'
      }
      return next
    })
  }

  const detailsDirty = useMemo(() => {
    if (!lead) return false
    const baseline = draftFromLead(lead)
    return Object.keys(baseline).some((key) => String(baseline[key] ?? '') !== String(detailsDraft[key] ?? ''))
  }, [lead, detailsDraft])

  useEffect(() => {
    if (!detailsDirty) return undefined
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [detailsDirty])

  async function persistDetails(payload) {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const updated = await updateAdminLead(lead.id, payload)
      setLead(updated)
      setDetailsDraft(draftFromLead(updated))
      setMessage('Lead saved.')
      setBookedConfirmOpen(false)
    } catch (err) {
      if (err.unauthorized) {
        onUnauthorized?.()
        return
      }
      setError(err.message || 'Failed to save lead')
      setBookedConfirmOpen(false)
    } finally {
      setSaving(false)
    }
  }

  function buildDetailsPayload() {
    const status = detailsDraft.status
    const isEarly = status === 'New' || status === 'Contacted'
    const payload = {
      status,
      // Always persist timezone server-side default; never require UI edit.
      appointmentTimezone: 'America/Los_Angeles',
      internalNotes: detailsDraft.internalNotes || null,
    }

    // Preserve amounts/appointment/follow-up values even when sections are hidden.
    payload.quotedAmount = moneyOrNull(detailsDraft.quotedAmount)
    payload.bookedAmount = moneyOrNull(detailsDraft.bookedAmount)
    payload.completedRevenue = moneyOrNull(detailsDraft.completedRevenue)
    payload.appointmentDate = detailsDraft.appointmentDate || null
    payload.appointmentStartTime = detailsDraft.appointmentStartTime || null
    payload.appointmentNotes = detailsDraft.appointmentNotes || null
    payload.paymentStatus = detailsDraft.paymentStatus || null
    payload.lostReason = detailsDraft.lostReason || null

    if (isEarly) {
      if (detailsDraft.followUpDate) {
        payload.followUpDate = detailsDraft.followUpDate
        payload.followUpNote = detailsDraft.followUpNote || null
      } else if (lead?.followUpDate) {
        payload.clearFollowUp = true
      } else {
        payload.followUpDate = null
        payload.followUpNote = detailsDraft.followUpNote || null
      }
    }

    if (status === 'Booked' && !payload.paymentStatus) {
      payload.paymentStatus = 'unpaid'
    }

    return payload
  }

  function handleDetailsSave(e) {
    e.preventDefault()
    if (!lead || !detailsDirty) return

    if (detailsDraft.status === 'Booked') {
      if (!detailsDraft.appointmentDate || !detailsDraft.appointmentStartTime) {
        setError('Appointment date and start time are required when status is Booked.')
        return
      }
      setError('')
      setBookedConfirmOpen(true)
      return
    }

    return persistDetails(buildDetailsPayload())
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 text-center text-[0.875rem] text-gray-500">
        Loading lead…
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6">
        <p className="text-[0.875rem] text-red-700">{error || 'Lead not found.'}</p>
        <Link to="/admin/leads" className="mt-3 inline-block text-[0.875rem] font-semibold text-royal-700">
          ← Back to inbox
        </Link>
      </div>
    )
  }

  const phoneLink = telHref(lead.phone)
  const emailLink = mailtoHref(lead.email)
  const notesHistory = Array.isArray(lead.notes) ? [...lead.notes].reverse() : []
  const history = Array.isArray(lead.statusHistory) ? [...lead.statusHistory].reverse() : []
  const followUpBadge = getFollowUpBadgeClient(lead)
  const status = detailsDraft.status
  const isEarly = status === 'New' || status === 'Contacted'
  const isBooked = status === 'Booked'
  const isCompleted = status === 'Completed'
  const isLost = status === 'Lost'
  const showFollowUpNote = Boolean(detailsDraft.followUpDate)

  return (
    <div className="space-y-3 pb-24 sm:space-y-4 sm:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/admin/leads" className="text-[0.875rem] font-semibold text-royal-700">
          ← Inbox
        </Link>
        <div className="flex flex-wrap gap-2">
          {phoneLink && (
            <a href={phoneLink} className="btn-secondary btn-sm !rounded-xl !px-3 !py-2">
              Call
            </a>
          )}
          {emailLink && (
            <a href={emailLink} className="btn-secondary btn-sm !rounded-xl !px-3 !py-2">
              Email
            </a>
          )}
        </div>
      </div>

      {message && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[0.8125rem] text-emerald-800" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-[0.8125rem] text-red-700" role="alert">
          {error}
        </p>
      )}
      {detailsDirty && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900" role="status">
          Unsaved changes — tap Save before leaving.
        </p>
      )}

      {/* Compact customer summary */}
      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-navy-900">{lead.name}</h2>
            <p className="mt-0.5 text-[0.75rem] text-gray-500">
              {formatLeadSource(lead.source)} · {formatLeadDate(lead.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-royal-50 px-2.5 py-1 text-[0.6875rem] font-semibold text-royal-800">
              {lead.status}
            </span>
            {isEarly ? <FollowUpBadge badge={followUpBadge} /> : null}
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-[0.875rem] text-navy-900">
          <p>
            <span className="text-gray-500">Phone · </span>
            {phoneLink ? (
              <a href={phoneLink} className="font-medium text-royal-700">
                {lead.phone}
              </a>
            ) : (
              lead.phone || '—'
            )}
          </p>
          <p>
            <span className="text-gray-500">Service · </span>
            {lead.service || '—'}
          </p>
          <p>
            <span className="text-gray-500">Address · </span>
            {[lead.address, lead.city].filter(Boolean).join(', ') || '—'}
          </p>
          {lead.quotedAmount != null && (
            <p>
              <span className="text-gray-500">Quoted · </span>
              {formatMoney(lead.quotedAmount)}
            </p>
          )}
        </div>
        {lead.message ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-[0.75rem] font-semibold text-royal-700">Customer message</summary>
            <p className="mt-2 whitespace-pre-wrap text-[0.8125rem] leading-relaxed text-gray-600">{lead.message}</p>
          </details>
        ) : null}
      </div>

      <form onSubmit={handleDetailsSave} className="space-y-3 sm:space-y-4">
        <Section title="Lead status" hint="New → Contacted → Booked → Completed or Lost">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {LEAD_STATUSES.map((s) => {
              const active = status === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateDetail('status', s)}
                  className={[
                    'min-h-11 rounded-xl px-2 py-2.5 text-[0.8125rem] font-semibold transition',
                    active ? 'bg-royal-600 text-white shadow-sm' : 'bg-gray-100 text-navy-900 hover:bg-gray-200',
                  ].join(' ')}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </Section>

        {isEarly && (
          <Section title="Quote & follow-up">
            <div>
              <label htmlFor="quoted-amount" className="mb-1 block text-[0.8125rem] font-medium text-gray-600">
                Quoted amount ($)
              </label>
              <input
                id="quoted-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={detailsDraft.quotedAmount}
                onChange={(e) => updateDetail('quotedAmount', e.target.value)}
                className="input-light"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="follow-up-date" className="mb-1 block text-[0.8125rem] font-medium text-gray-600">
                Follow-up date
              </label>
              <input
                id="follow-up-date"
                type="date"
                value={detailsDraft.followUpDate}
                onChange={(e) => updateDetail('followUpDate', e.target.value)}
                className="input-light"
              />
              <p className="mt-1 text-[0.6875rem] text-gray-400">Reminder for you to call this lead — not a customer appointment.</p>
            </div>
            {showFollowUpNote && (
              <div>
                <label htmlFor="follow-up-note" className="mb-1 block text-[0.8125rem] font-medium text-gray-600">
                  Follow-up note
                </label>
                <textarea
                  id="follow-up-note"
                  rows={2}
                  value={detailsDraft.followUpNote}
                  onChange={(e) => updateDetail('followUpNote', e.target.value)}
                  className="input-light resize-none"
                  placeholder="Call about estimate…"
                />
              </div>
            )}
            {detailsDraft.followUpDate ? (
              <p className="text-[0.75rem] text-gray-400">
                Scheduled for {formatFollowUpDate(detailsDraft.followUpDate)}
              </p>
            ) : null}
          </Section>
        )}

        {isBooked && (
          <Section title="Appointment" hint="Required for Booked. Timezone is Pacific (automatic).">
            {detailsDraft.quotedAmount !== '' && detailsDraft.quotedAmount != null && (
              <p className="rounded-xl bg-gray-50 px-3 py-2 text-[0.8125rem] text-gray-600">
                Quoted reference: <span className="font-semibold text-navy-900">{formatMoney(detailsDraft.quotedAmount)}</span>
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="appt-date" className="mb-1 block text-[0.8125rem] font-medium text-gray-600">
                  Appointment date <span className="text-amber-600">*</span>
                </label>
                <input
                  id="appt-date"
                  type="date"
                  value={detailsDraft.appointmentDate}
                  onChange={(e) => updateDetail('appointmentDate', e.target.value)}
                  className="input-light"
                  required
                />
              </div>
              <div>
                <label htmlFor="appt-time" className="mb-1 block text-[0.8125rem] font-medium text-gray-600">
                  Start time <span className="text-amber-600">*</span>
                </label>
                <input
                  id="appt-time"
                  type="time"
                  value={detailsDraft.appointmentStartTime}
                  onChange={(e) => updateDetail('appointmentStartTime', e.target.value)}
                  className="input-light"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="booked-amount" className="mb-1 block text-[0.8125rem] font-medium text-gray-600">
                Booked amount ($)
              </label>
              <input
                id="booked-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={detailsDraft.bookedAmount}
                onChange={(e) => updateDetail('bookedAmount', e.target.value)}
                className="input-light"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="appt-notes" className="mb-1 block text-[0.8125rem] font-medium text-gray-600">
                Access notes
              </label>
              <textarea
                id="appt-notes"
                rows={2}
                value={detailsDraft.appointmentNotes}
                onChange={(e) => updateDetail('appointmentNotes', e.target.value)}
                className="input-light resize-none"
                placeholder="Gate code, parking, dogs…"
              />
            </div>
            <div>
              <label htmlFor="payment-status" className="mb-1 block text-[0.8125rem] font-medium text-gray-600">
                Payment status
              </label>
              <select
                id="payment-status"
                value={detailsDraft.paymentStatus || 'unpaid'}
                onChange={(e) => updateDetail('paymentStatus', e.target.value)}
                className="input-light"
              >
                {PAYMENT_STATUSES.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </Section>
        )}

        {isCompleted && (
          <Section title="Completed job">
            {(detailsDraft.appointmentDate || detailsDraft.bookedAmount !== '') && (
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-[0.8125rem] text-gray-600">
                {detailsDraft.appointmentDate ? (
                  <p>
                    Appointment:{' '}
                    <span className="font-semibold text-navy-900">
                      {formatAppointmentDate(detailsDraft.appointmentDate)} ·{' '}
                      {formatAppointmentTime(detailsDraft.appointmentStartTime)}
                    </span>
                  </p>
                ) : null}
                {detailsDraft.bookedAmount !== '' && detailsDraft.bookedAmount != null ? (
                  <p className="mt-1">
                    Booked amount:{' '}
                    <span className="font-semibold text-navy-900">{formatMoney(detailsDraft.bookedAmount)}</span>
                  </p>
                ) : null}
              </div>
            )}
            <div>
              <label htmlFor="completed-revenue" className="mb-1 block text-[0.8125rem] font-medium text-gray-600">
                Completed revenue ($)
              </label>
              <input
                id="completed-revenue"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={detailsDraft.completedRevenue}
                onChange={(e) => updateDetail('completedRevenue', e.target.value)}
                className="input-light"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="payment-status-completed" className="mb-1 block text-[0.8125rem] font-medium text-gray-600">
                Payment status
              </label>
              <select
                id="payment-status-completed"
                value={detailsDraft.paymentStatus || ''}
                onChange={(e) => updateDetail('paymentStatus', e.target.value)}
                className="input-light"
              >
                {PAYMENT_STATUSES.map((o) => (
                  <option key={o.value || 'unset'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </Section>
        )}

        {isLost && (
          <Section title="Lost lead">
            <div>
              <label htmlFor="lost-reason" className="mb-1 block text-[0.8125rem] font-medium text-gray-600">
                Lost reason (optional)
              </label>
              <textarea
                id="lost-reason"
                rows={2}
                value={detailsDraft.lostReason}
                onChange={(e) => updateDetail('lostReason', e.target.value)}
                className="input-light resize-none"
                placeholder="Price, timing, hired someone else…"
              />
            </div>
          </Section>
        )}

        <Section title="Private notes" hint="Editable notes for this lead. Older append-only notes stay in history below.">
          <textarea
            id="internal-notes"
            rows={3}
            value={detailsDraft.internalNotes}
            onChange={(e) => updateDetail('internalNotes', e.target.value)}
            className="input-light resize-none"
            placeholder="Private notes…"
          />
        </Section>

        {/* Sticky primary save on mobile */}
        <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-black/[0.06] bg-white/95 px-4 py-3 backdrop-blur-xl sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <button
            type="submit"
            disabled={saving || !detailsDirty}
            className="btn-royal btn-md w-full !rounded-xl disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            style={{ marginBottom: 'max(0px, env(safe-area-inset-bottom))' }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {bookedConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booked-confirm-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 id="booked-confirm-title" className="font-display text-lg font-semibold text-navy-900">
              Confirm booking
            </h3>
            <p className="mt-2 text-[0.8125rem] text-gray-600">
              Save as <strong>Booked</strong>? No customer message is sent yet.
            </p>
            <dl className="mt-4 space-y-1.5 rounded-xl bg-gray-50 px-3 py-3 text-[0.8125rem]">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium text-navy-900 text-right">{lead.name}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium text-navy-900 text-right">{lead.phone}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Service</dt>
                <dd className="font-medium text-navy-900 text-right">{lead.service || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Address</dt>
                <dd className="font-medium text-navy-900 text-right">
                  {[lead.address, lead.city].filter(Boolean).join(' · ') || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Appointment</dt>
                <dd className="font-medium text-navy-900 text-right">
                  {formatAppointmentDate(detailsDraft.appointmentDate)} ·{' '}
                  {formatAppointmentTime(detailsDraft.appointmentStartTime)}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn-secondary btn-md !rounded-xl"
                disabled={saving}
                onClick={() => setBookedConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-royal btn-md !rounded-xl"
                disabled={saving}
                onClick={() => persistDetails(buildDetailsPayload())}
              >
                {saving ? 'Saving…' : 'Confirm & save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {notesHistory.length > 0 && (
        <details className="rounded-2xl border border-black/[0.06] bg-white p-4">
          <summary className="cursor-pointer font-display text-sm font-semibold text-navy-900">
            Note history ({notesHistory.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {notesHistory.map((n) => (
              <li key={n.id} className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="whitespace-pre-wrap text-[0.8125rem] text-gray-700">{n.text}</p>
                <p className="mt-1 text-[0.6875rem] text-gray-400">{formatLeadDate(n.at)}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="rounded-2xl border border-black/[0.06] bg-white p-4">
        <summary className="cursor-pointer font-display text-sm font-semibold text-navy-900">
          Status history & attribution
        </summary>
        <div className="mt-3 space-y-3">
          {history.length ? (
            <ol className="space-y-2">
              {history.map((h, idx) => (
                <li key={`${h.at}-${h.status}-${idx}`} className="text-[0.8125rem]">
                  <span className="font-medium text-navy-900">{h.status}</span>
                  <span className="text-gray-400">
                    {' '}
                    · {formatLeadDate(h.at)}
                    {h.by ? ` · ${h.by}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[0.8125rem] text-gray-500">No status history yet.</p>
          )}
          <div className="grid gap-2 border-t border-black/[0.04] pt-3 text-[0.75rem] text-gray-500">
            <Field label="Email">{lead.email}</Field>
            <Field label="Landing page">
              <span className="break-all font-mono">{lead.originalLandingPage || '—'}</span>
            </Field>
            <Field label="UTM">
              {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(' / ') || '—'}
            </Field>
          </div>
        </div>
      </details>

      <p className="text-[0.6875rem] text-gray-400">
        ID <span className="font-mono">{lead.id}</span> · Updated {formatLeadDate(lead.updatedAt)}
      </p>
    </div>
  )
}
