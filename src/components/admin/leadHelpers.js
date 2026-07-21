export const LEAD_STATUSES = [
  'New Lead',
  'Contacted',
  'Estimate Scheduled',
  'Estimate Sent',
  'Booked',
  'Completed',
  'Lost',
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
