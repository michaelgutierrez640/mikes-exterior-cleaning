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
