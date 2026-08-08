export const LEAD_STATUSES = ['New', 'Contacted', 'Booked', 'Completed', 'Lost']

export const PAYMENT_STATUSES = [
  { value: '', label: 'Not set' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'deposit', label: 'Deposit paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'na', label: 'N/A' },
]

export const APPOINTMENT_STATUSES = [
  { value: 'none', label: 'None' },
  { value: 'requested', label: 'Requested' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
]

export const LEAD_SOURCE_LABELS = {
  instant_quote: 'Instant Quote',
  contact: 'Contact',
  booking: 'Booking',
}

export const FOLLOW_UP_BADGE_LABELS = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  completed: 'Completed',
  none: 'No Follow-Up',
}

export function formatLeadSource(source) {
  return LEAD_SOURCE_LABELS[source] || source || '—'
}

export function formatLeadDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatFollowUpDate(dateKey) {
  if (!dateKey) return '—'
  const d = new Date(`${dateKey}T12:00:00`)
  if (Number.isNaN(d.getTime())) return dateKey
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatAppointmentDate(dateKey) {
  return formatFollowUpDate(dateKey)
}

export function formatAppointmentTime(hhmm) {
  if (!hhmm) return '—'
  const m = String(hhmm).match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return hhmm
  let hh = Number(m[1])
  const mm = m[2]
  const suffix = hh >= 12 ? 'PM' : 'AM'
  hh = hh % 12
  if (hh === 0) hh = 12
  return `${hh}:${mm} ${suffix}`
}

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

export function moneyInputValue(value) {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return String(n)
}

export function telHref(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  return `tel:${digits}`
}

export function mailtoHref(email) {
  const e = String(email || '').trim()
  if (!e) return null
  return `mailto:${e}`
}
