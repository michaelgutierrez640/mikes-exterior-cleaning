/**
 * Transactional SMS copy for Mike's Exterior Cleaning Services.
 * Keep marketing texts out of this module.
 */
import { SMS_BUSINESS_NAME } from './smsConfig.mjs'

export function firstNameFromFullName(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return 'there'
  return trimmed.split(/\s+/)[0]
}

export function formatAppointmentTime(hhmm) {
  const m = String(hhmm || '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return String(hhmm || '').trim()
  let hh = Number(m[1])
  const mm = m[2]
  const suffix = hh >= 12 ? 'PM' : 'AM'
  hh = hh % 12
  if (hh === 0) hh = 12
  return `${hh}:${mm} ${suffix}`
}

export function formatAppointmentDate(dateKey) {
  const s = String(dateKey || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(`${s}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return s
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

export function formatQuoteAmount(amount) {
  if (amount == null || amount === '') return null
  const n = Number(amount)
  if (!Number.isFinite(n)) return null
  if (Number.isInteger(n)) return `$${n}`
  return `$${n.toFixed(2)}`
}

export function buildOwnerNewLeadMessage(lead) {
  const name = String(lead?.name || 'Customer').trim() || 'Customer'
  const service = String(lead?.service || 'service').trim() || 'service'
  const city = String(lead?.city || 'unknown city').trim() || 'unknown city'
  const phone = String(lead?.phone || '').trim() || 'n/a'
  const quote = formatQuoteAmount(lead?.quotedAmount)
  const quotePart = quote ? ` Quote: ${quote}.` : ''
  return `New Instant Quote: ${name} · ${service} · ${city} · ${phone}.${quotePart}`
}

export function buildCustomerQuoteReceivedMessage(lead) {
  const first = firstNameFromFullName(lead?.name)
  const service = String(lead?.service || 'your service').trim() || 'your service'
  return `Hi ${first}, this is ${SMS_BUSINESS_NAME}. We received your quote request for ${service}. Mike will reach out shortly. Reply STOP to opt out.`
}

export function buildBookingConfirmationMessage(lead) {
  const first = firstNameFromFullName(lead?.name)
  const service = String(lead?.service || 'your service').trim() || 'your service'
  const date = formatAppointmentDate(lead?.appointmentDate)
  const time = formatAppointmentTime(lead?.appointmentStartTime)
  return `Hi ${first}, you're booked with ${SMS_BUSINESS_NAME} for ${service} on ${date} at ${time}. Reply here if you have any questions. Reply STOP to opt out.`
}

export function buildAppointmentUpdatedMessage(lead) {
  const first = firstNameFromFullName(lead?.name)
  const service = String(lead?.service || 'your service').trim() || 'your service'
  const date = formatAppointmentDate(lead?.appointmentDate)
  const time = formatAppointmentTime(lead?.appointmentStartTime)
  return `Hi ${first}, your appointment with ${SMS_BUSINESS_NAME} for ${service} was updated to ${date} at ${time}. Reply here if you have any questions. Reply STOP to opt out.`
}

export function buildReminderMessage(lead) {
  const service = String(lead?.service || 'your service').trim() || 'your service'
  const time = formatAppointmentTime(lead?.appointmentStartTime)
  return `Reminder from ${SMS_BUSINESS_NAME}: we're scheduled for ${service} tomorrow at ${time}. We'll see you then!`
}

export function buildReviewRequestMessage(lead, reviewUrl) {
  const first = firstNameFromFullName(lead?.name)
  const url = String(reviewUrl || '').trim()
  const linkPart = url ? ` ${url}` : ''
  return `Hi ${first}, thanks for choosing ${SMS_BUSINESS_NAME}! If you have a minute, we'd appreciate a Google review:${linkPart} Reply STOP to opt out.`
}
