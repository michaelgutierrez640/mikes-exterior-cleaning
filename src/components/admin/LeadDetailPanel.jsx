import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchAdminLead,
  permanentlyDeleteAdminLead,
  restoreAdminLead,
  trashAdminLead,
  updateAdminLead,
} from '../../services/adminApi'
import AdminToast from './AdminToast'
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
import { leadPhotoAdminUrl } from '../../utils/leadPhotos'

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

function emptyDetailsDraft() {
  return {
    status: 'New',
    appointmentDate: '',
    appointmentStartTime: '',
    appointmentTimezone: 'America/Los_Angeles',
    appointmentStatus: 'none',
    appointmentNotes: '',
    quotedAmount: '',
    bookedAmount: '',
    completedRevenue: '',
    paymentStatus: '',
    internalNotes: '',
  }
}

function draftFromLead(lead) {
  if (!lead) return emptyDetailsDraft()
  return {
    status: lead.status || 'New',
    appointmentDate: lead.appointmentDate || '',
    appointmentStartTime: lead.appointmentStartTime || '',
    appointmentTimezone: lead.appointmentTimezone || 'America/Los_Angeles',
    appointmentStatus: lead.appointmentStatus || 'none',
    appointmentNotes: lead.appointmentNotes || '',
    quotedAmount: moneyInputValue(lead.quotedAmount),
    bookedAmount: moneyInputValue(lead.bookedAmount),
    completedRevenue: moneyInputValue(lead.completedRevenue),
    paymentStatus: lead.paymentStatus || '',
    internalNotes: lead.internalNotes || '',
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
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState(null)
  const [detailsDraft, setDetailsDraft] = useState(emptyDetailsDraft())
  const [followUpDateDraft, setFollowUpDateDraft] = useState('')
  const [followUpNoteDraft, setFollowUpNoteDraft] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [bookedConfirmOpen, setBookedConfirmOpen] = useState(false)
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false)
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false)
  const [permanentDeleteConfirmText, setPermanentDeleteConfirmText] = useState('')
  const [permanentlyDeleted, setPermanentlyDeleted] = useState(false)

  const showToast = useCallback((message, tone = 'success') => {
    setToast({ id: Date.now(), message, tone })
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    setPermanentlyDeleted(false)
    try {
      const data = await fetchAdminLead(leadId)
      if (data?.unauthorized) {
        onUnauthorized?.()
        return
      }
      setLead(data.lead)
      setDetailsDraft(draftFromLead(data.lead))
      setFollowUpDateDraft(data.lead?.followUpDate || '')
      setFollowUpNoteDraft(data.lead?.followUpNote || '')
    } catch (err) {
      setLoadError(err.message || 'Failed to load lead')
      setLead(null)
    } finally {
      setLoading(false)
    }
  }, [leadId, onUnauthorized])

  useEffect(() => {
    load()
  }, [load])

  const updateDetail = (field, value) => {
    setDetailsDraft((prev) => ({ ...prev, [field]: value }))
  }

  const detailsDirty = useMemo(() => {
    if (!lead) return false
    const baseline = draftFromLead(lead)
    return Object.keys(baseline).some((key) => String(baseline[key] ?? '') !== String(detailsDraft[key] ?? ''))
  }, [lead, detailsDraft])

  const busy = Boolean(pendingAction)

  async function persistDetails(payload) {
    setPendingAction('details')
    try {
      const updated = await updateAdminLead(lead.id, payload)
      setLead(updated)
      setDetailsDraft(draftFromLead(updated))
      setFollowUpDateDraft(updated.followUpDate || '')
      setFollowUpNoteDraft(updated.followUpNote || '')
      setBookedConfirmOpen(false)
      showToast('Changes saved')
    } catch (err) {
      if (err.unauthorized) {
        onUnauthorized?.()
        return
      }
      setBookedConfirmOpen(false)
      showToast(err.message || 'Failed to save lead', 'error')
    } finally {
      setPendingAction(null)
    }
  }

  function buildDetailsPayload() {
    return {
      status: detailsDraft.status,
      appointmentDate: detailsDraft.appointmentDate || null,
      appointmentStartTime: detailsDraft.appointmentStartTime || null,
      appointmentTimezone: detailsDraft.appointmentTimezone || 'America/Los_Angeles',
      // Preserve existing appointmentStatus without exposing a duplicate UI control.
      appointmentStatus: detailsDraft.appointmentStatus || lead?.appointmentStatus || 'none',
      appointmentNotes: detailsDraft.appointmentNotes || null,
      quotedAmount: moneyOrNull(detailsDraft.quotedAmount),
      bookedAmount: moneyOrNull(detailsDraft.bookedAmount),
      completedRevenue: moneyOrNull(detailsDraft.completedRevenue),
      paymentStatus: detailsDraft.paymentStatus || null,
      internalNotes: detailsDraft.internalNotes || null,
    }
  }

  function handleDetailsSave(e) {
    e.preventDefault()
    if (!lead || !detailsDirty || busy) return

    if (detailsDraft.status === 'Booked') {
      if (!detailsDraft.appointmentDate || !detailsDraft.appointmentStartTime) {
        showToast('Appointment date and start time are required when status is Booked.', 'error')
        return
      }
      setBookedConfirmOpen(true)
      return
    }

    return persistDetails(buildDetailsPayload())
  }

  async function handleFollowUpSave(e) {
    e.preventDefault()
    if (!lead || busy) return
    setPendingAction('followUp')
    try {
      const updated = await updateAdminLead(lead.id, {
        followUpDate: followUpDateDraft || null,
        followUpNote: followUpNoteDraft,
      })
      setLead(updated)
      setFollowUpDateDraft(updated.followUpDate || '')
      setFollowUpNoteDraft(updated.followUpNote || '')
      showToast(updated.followUpDate ? 'Follow-up saved' : 'Follow-up date cleared')
    } catch (err) {
      if (err.unauthorized) {
        onUnauthorized?.()
        return
      }
      showToast(err.message || 'Failed to save follow-up', 'error')
    } finally {
      setPendingAction(null)
    }
  }

  async function handleFollowUpClear() {
    if (!lead || busy) return
    setPendingAction('clearFollowUp')
    try {
      const updated = await updateAdminLead(lead.id, { clearFollowUp: true })
      setLead(updated)
      setFollowUpDateDraft('')
      setFollowUpNoteDraft('')
      showToast('Follow-up cleared')
    } catch (err) {
      if (err.unauthorized) {
        onUnauthorized?.()
        return
      }
      showToast(err.message || 'Failed to clear follow-up', 'error')
    } finally {
      setPendingAction(null)
    }
  }

  async function handleMoveToTrash() {
    if (!lead || busy) return
    setPendingAction('trash')
    try {
      const updated = await trashAdminLead(lead.id)
      setLead(updated)
      setTrashConfirmOpen(false)
      showToast('Lead moved to Trash')
    } catch (err) {
      if (err.unauthorized) {
        onUnauthorized?.()
        return
      }
      showToast(err.message || 'Failed to move lead to Trash', 'error')
    } finally {
      setPendingAction(null)
    }
  }

  async function handleRestore() {
    if (!lead || busy) return
    setPendingAction('restore')
    try {
      const updated = await restoreAdminLead(lead.id)
      setLead(updated)
      showToast('Lead restored')
    } catch (err) {
      if (err.unauthorized) {
        onUnauthorized?.()
        return
      }
      showToast(err.message || 'Failed to restore lead', 'error')
    } finally {
      setPendingAction(null)
    }
  }

  async function handlePermanentDelete() {
    if (!lead || busy) return
    if (permanentDeleteConfirmText.trim() !== 'DELETE') return
    setPendingAction('permanentDelete')
    try {
      await permanentlyDeleteAdminLead(lead.id)
      setPermanentDeleteOpen(false)
      setPermanentDeleteConfirmText('')
      setLead(null)
      setPermanentlyDeleted(true)
      showToast('Lead permanently deleted')
    } catch (err) {
      if (err.unauthorized) {
        onUnauthorized?.()
        return
      }
      showToast(err.message || 'Failed to permanently delete lead', 'error')
    } finally {
      setPendingAction(null)
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
        <p className="text-[0.875rem] text-navy-900">
          {permanentlyDeleted ? 'Lead permanently deleted.' : loadError || 'Lead not found.'}
        </p>
        <Link
          to="/admin/leads"
          className="mt-4 inline-block text-[0.875rem] font-semibold text-royal-700 hover:text-royal-800"
        >
          ← Back to inbox
        </Link>
        <AdminToast toast={toast} onDismiss={dismissToast} />
      </div>
    )
  }

  const phoneLink = telHref(lead.phone)
  const emailLink = mailtoHref(lead.email)
  const history = Array.isArray(lead.statusHistory) ? [...lead.statusHistory].reverse() : []
  const followUpBadge = getFollowUpBadgeClient(lead)
  const requiresAppointment = detailsDraft.status === 'Booked'

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

      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-navy-900">{lead.name}</h2>
            <p className="mt-1 text-[0.875rem] text-gray-500">
              {formatLeadSource(lead.source)} · Submitted {formatLeadDate(lead.createdAt)}
              {lead.bookingLinkedAt ? ' · Booking linked to this lead' : ''}
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
          <Field label="Appointment">
            {lead.appointmentDate
              ? `${formatAppointmentDate(lead.appointmentDate)} · ${formatAppointmentTime(lead.appointmentStartTime)} (${lead.appointmentTimezone || 'America/Los_Angeles'})`
              : '—'}
          </Field>
          <Field label="Quoted amount">{formatMoney(lead.quotedAmount)}</Field>
        </div>

        {Array.isArray(lead.problems) && lead.problems.length > 0 && (
          <div className="mt-8">
            <Field label="Problems selected">
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[0.9375rem] leading-relaxed text-gray-700">
                {lead.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </Field>
          </div>
        )}

        <div className="mt-8">
          <Field label="Customer message">
            <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-gray-700">
              {lead.message || '—'}
            </p>
          </Field>
        </div>

        {lead.photoWarning && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-950">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-800 uppercase">
              Photo upload warning
            </p>
            <p className="mt-1">{lead.photoWarning}</p>
          </div>
        )}

        {Array.isArray(lead.photos) && lead.photos.length > 0 && (
          <div className="mt-8">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">
              Customer photos
            </p>
            <p className="mt-1 text-[0.75rem] text-gray-500">
              Streamed through an authenticated Admin endpoint — raw Blob URLs are never shown.
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {lead.photos.map((photo, index) => {
                const src = leadPhotoAdminUrl(photo)
                const label = photo.originalName || `Photo ${index + 1}`
                return (
                  <li key={photo.pathname || index} className="overflow-hidden rounded-xl border border-black/[0.06] bg-gray-50">
                    <a href={src} target="_blank" rel="noreferrer" className="block">
                      <img
                        src={src}
                        alt={label}
                        className="aspect-square w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                    <p className="truncate px-2 py-1.5 text-[0.7rem] text-gray-500" title={label}>
                      {label}
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <form
        onSubmit={handleDetailsSave}
        className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-navy-900">Pipeline, appointment & revenue</h3>
            <p className="mt-1 text-[0.8125rem] text-gray-500">
              Status path: New → Contacted → Booked → Completed or Lost. No customer messages are sent from this screen.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">Status</p>
          <div className="flex flex-wrap gap-2">
            {LEAD_STATUSES.map((s) => {
              const active = detailsDraft.status === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateDetail('status', s)}
                  className={[
                    'rounded-xl px-3 py-2 text-[0.8125rem] font-semibold transition',
                    active ? 'bg-royal-600 text-white' : 'bg-gray-100 text-navy-900 hover:bg-gray-200',
                  ].join(' ')}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="appt-date" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
              Appointment date {requiresAppointment && <span className="text-amber-600">*</span>}
            </label>
            <input
              id="appt-date"
              type="date"
              value={detailsDraft.appointmentDate}
              onChange={(e) => updateDetail('appointmentDate', e.target.value)}
              className="input-light"
              required={requiresAppointment}
            />
          </div>
          <div>
            <label htmlFor="appt-time" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
              Appointment start time {requiresAppointment && <span className="text-amber-600">*</span>}
            </label>
            <input
              id="appt-time"
              type="time"
              value={detailsDraft.appointmentStartTime}
              onChange={(e) => updateDetail('appointmentStartTime', e.target.value)}
              className="input-light"
              required={requiresAppointment}
            />
          </div>
          <div>
            <label htmlFor="appt-tz" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
              Timezone
            </label>
            <input
              id="appt-tz"
              type="text"
              value={detailsDraft.appointmentTimezone}
              onChange={(e) => updateDetail('appointmentTimezone', e.target.value)}
              className="input-light"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="appt-notes" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
              Appointment notes (optional)
            </label>
            <textarea
              id="appt-notes"
              rows={2}
              value={detailsDraft.appointmentNotes}
              onChange={(e) => updateDetail('appointmentNotes', e.target.value)}
              className="input-light resize-none"
              placeholder="Gate code, parking, special access…"
            />
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="quoted-amount" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
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
            <label htmlFor="booked-amount" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
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
            <label htmlFor="completed-revenue" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
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
            <label htmlFor="payment-status" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
              Payment status
            </label>
            <select
              id="payment-status"
              value={detailsDraft.paymentStatus}
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
        </div>

        {detailsDraft.status === 'Completed' && (
          <p className="mt-3 text-[0.8125rem] text-gray-500">
            Enter completed revenue and payment status when the job is finished. Review-request messages are not sent yet.
          </p>
        )}

        <div className="mt-6">
          <label htmlFor="internal-notes" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
            Internal notes (optional)
          </label>
          <textarea
            id="internal-notes"
            rows={3}
            value={detailsDraft.internalNotes}
            onChange={(e) => updateDetail('internalNotes', e.target.value)}
            className="input-light resize-none"
            placeholder="Private notes for your reference…"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy || !detailsDirty}
            className="btn-royal btn-md !rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingAction === 'details' ? 'Saving…' : 'Save changes'}
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
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 id="booked-confirm-title" className="font-display text-xl font-semibold text-navy-900">
              Confirm booking
            </h3>
            <p className="mt-2 text-[0.875rem] text-gray-600">
              Save this lead as <strong>Booked</strong>? When SMS is activated, customers who opted in
              receive one booking confirmation (not on every later edit).
            </p>
            <dl className="mt-5 space-y-2 rounded-xl bg-gray-50 px-4 py-3 text-[0.875rem] text-navy-900">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium text-right">{lead.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium text-right">{lead.phone}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Service</dt>
                <dd className="font-medium text-right">{lead.service || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Address / city</dt>
                <dd className="font-medium text-right">
                  {[lead.address, lead.city].filter(Boolean).join(' · ') || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Appointment</dt>
                <dd className="font-medium text-right">
                  {formatAppointmentDate(detailsDraft.appointmentDate)} ·{' '}
                  {formatAppointmentTime(detailsDraft.appointmentStartTime)}
                  <br />
                  <span className="text-[0.75rem] text-gray-500">
                    {detailsDraft.appointmentTimezone || 'America/Los_Angeles'}
                  </span>
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn-secondary btn-md !rounded-xl"
                disabled={busy}
                onClick={() => setBookedConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-royal btn-md !rounded-xl"
                disabled={busy}
                onClick={() => persistDetails(buildDetailsPayload())}
              >
                {pendingAction === 'details' ? 'Saving…' : 'Confirm & save Booked'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-7">
        <h3 className="font-display text-lg font-semibold text-navy-900">SMS automation</h3>
        <p className="mt-1 text-[0.8125rem] text-gray-500">
          Read-only consent, opt-out history, and message thread. Real texts send only after SMS is activated in
          Vercel.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Field label="Customer SMS consent">
            {lead.smsConsent ? `Yes${lead.smsConsentAt ? ` · ${formatLeadDate(lead.smsConsentAt)}` : ''}` : 'No'}
          </Field>
          <Field label="Consent source / phone">
            {[lead.smsConsentSource || null, lead.smsConsentPhone || lead.phone || null]
              .filter(Boolean)
              .join(' · ') || '—'}
          </Field>
          <Field label="Opted out (active)">
            {lead.smsOptedOut ? `Yes${lead.smsOptedOutAt ? ` · ${formatLeadDate(lead.smsOptedOutAt)}` : ''}` : 'No'}
          </Field>
          <Field label="Quote confirmation SMS">
            {lead.automationState?.quoteReceivedSmsAt
              ? formatLeadDate(lead.automationState.quoteReceivedSmsAt)
              : '—'}
          </Field>
          <Field label="Owner new-lead SMS">
            {lead.automationState?.ownerNewLeadSmsAt
              ? formatLeadDate(lead.automationState.ownerNewLeadSmsAt)
              : '—'}
          </Field>
          <Field label="Booking confirmation SMS">
            {lead.automationState?.bookingConfirmSmsAt
              ? formatLeadDate(lead.automationState.bookingConfirmSmsAt)
              : '—'}
          </Field>
          <Field label="Appointment reminder SMS">
            {lead.automationState?.reminderSmsAt
              ? formatLeadDate(lead.automationState.reminderSmsAt)
              : '—'}
          </Field>
          <Field label="Review request due">
            {lead.automationState?.reviewRequestDueAt
              ? formatLeadDate(lead.automationState.reviewRequestDueAt)
              : '—'}
          </Field>
          <Field label="Review request SMS">
            {lead.automationState?.reviewRequestSmsAt
              ? formatLeadDate(lead.automationState.reviewRequestSmsAt)
              : '—'}
          </Field>
          <Field label="Last SMS error">
            <span className="break-all text-[0.8125rem]">{lead.smsLastError || '—'}</span>
          </Field>
        </div>

        {(lead.smsOptOutHistory || []).length > 0 && (
          <div className="mt-8">
            <h4 className="text-[0.8125rem] font-semibold uppercase tracking-wide text-gray-500">
              Opt-out / resubscribe history
            </h4>
            <ul className="mt-3 space-y-2">
              {[...(lead.smsOptOutHistory || [])].reverse().map((event, idx) => (
                <li
                  key={`${event.at || 'evt'}-${idx}`}
                  className="rounded-xl bg-gray-50 px-4 py-3 text-[0.8125rem] text-navy-900"
                >
                  <span className="font-medium capitalize">{event.event?.replace('_', ' ') || 'event'}</span>
                  {event.keyword ? ` · ${event.keyword}` : ''}
                  {event.at ? ` · ${formatLeadDate(event.at)}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8">
          <h4 className="text-[0.8125rem] font-semibold uppercase tracking-wide text-gray-500">
            Message thread
          </h4>
          {(lead.smsThread || []).length === 0 ? (
            <p className="mt-3 text-[0.8125rem] text-gray-400">No SMS messages stored for this lead yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {[...(lead.smsThread || [])].map((msg) => (
                <li
                  key={msg.id || `${msg.at}-${msg.direction}`}
                  className={`rounded-xl px-4 py-3 text-[0.8125rem] ${
                    msg.direction === 'inbound'
                      ? 'bg-royal-50/70 text-navy-900'
                      : 'bg-gray-50 text-navy-900'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-gray-500">
                    <span className="font-semibold uppercase tracking-wide text-navy-800">
                      {msg.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                    </span>
                    {msg.kind ? <span>· {msg.kind}</span> : null}
                    {msg.at ? <span>· {formatLeadDate(msg.at)}</span> : null}
                    {msg.status ? <span>· {msg.status}</span> : null}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words">{msg.body || '—'}</p>
                </li>
              ))}
            </ul>
          )}
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
            disabled={busy}
            className="btn-royal btn-md !rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingAction === 'followUp' ? 'Saving…' : 'Save follow-up'}
          </button>
          <button
            type="button"
            onClick={handleFollowUpClear}
            disabled={busy || (!lead.followUpDate && !lead.followUpNote)}
            className="btn-secondary btn-md !rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear follow-up
          </button>
        </div>
      </form>

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

      <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-7">
        <h3 className="font-display text-lg font-semibold text-red-800">Danger zone</h3>
        {lead.deletedAt ? (
          <>
            <p className="mt-2 text-[0.875rem] text-red-900/80">
              This lead is in Trash
              {lead.deletedAt ? ` (moved ${formatLeadDate(lead.deletedAt)}` : ''}
              {lead.deletedBy ? ` by ${lead.deletedBy}` : ''}
              {lead.deletedAt ? ')' : ''}. Restoring puts it back in normal admin views. Permanent deletion cannot be
              undone.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleRestore}
                className="btn-royal btn-md !rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingAction === 'restore' ? 'Working…' : 'Restore lead'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPermanentDeleteConfirmText('')
                  setPermanentDeleteOpen(true)
                }}
                className="rounded-xl bg-red-700 px-4 py-2.5 text-[0.875rem] font-semibold text-white shadow-sm hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Permanently delete…
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-[0.875rem] text-red-900/80">
              Move this lead to Trash to hide it from Active, Completed, All, search, follow-ups, and reports. You can
              restore it later from Trash.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => setTrashConfirmOpen(true)}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-[0.875rem] font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Move to Trash
            </button>
          </>
        )}
      </div>

      {trashConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trash-confirm-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 id="trash-confirm-title" className="font-display text-xl font-semibold text-navy-900">
              Move to Trash
            </h3>
            <p className="mt-2 text-[0.875rem] text-gray-600">
              Move {lead.name || 'this lead'} to Trash? This will remove the lead from all normal admin views.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn-secondary btn-md !rounded-xl"
                disabled={busy}
                onClick={() => setTrashConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-4 py-2.5 text-[0.875rem] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                disabled={busy}
                onClick={handleMoveToTrash}
              >
                {pendingAction === 'trash' ? 'Moving…' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {permanentDeleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="permanent-delete-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 id="permanent-delete-title" className="font-display text-xl font-semibold text-navy-900">
              Permanently delete lead
            </h3>
            <p className="mt-2 text-[0.875rem] text-gray-600">
              This permanently deletes {lead.name || 'this lead'} and its SMS consent history, opt-out history, message
              thread, and automation timestamps. Other leads with the same phone or email are not affected. This cannot
              be undone.
            </p>
            <label htmlFor="permanent-delete-confirm" className="mt-5 mb-1.5 block text-[0.8125rem] font-medium text-gray-600">
              Type DELETE to confirm
            </label>
            <input
              id="permanent-delete-confirm"
              type="text"
              value={permanentDeleteConfirmText}
              onChange={(e) => setPermanentDeleteConfirmText(e.target.value)}
              className="input-light"
              autoComplete="off"
              placeholder="DELETE"
            />
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn-secondary btn-md !rounded-xl"
                disabled={busy}
                onClick={() => {
                  setPermanentDeleteOpen(false)
                  setPermanentDeleteConfirmText('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-700 px-4 py-2.5 text-[0.875rem] font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy || permanentDeleteConfirmText.trim() !== 'DELETE'}
                onClick={handlePermanentDelete}
              >
                {pendingAction === 'permanentDelete' ? 'Deleting…' : 'Permanently delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[0.75rem] text-gray-400">
        Lead ID <span className="font-mono">{lead.id}</span> · Updated {formatLeadDate(lead.updatedAt)}
        {lead.appointmentConfirmedAt ? ` · Appointment confirmed ${formatLeadDate(lead.appointmentConfirmedAt)}` : ''}
      </p>

      <AdminToast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}
