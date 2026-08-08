import { BUSINESS } from '../config/business'
import { getLeadAttribution } from '../utils/analytics'
import { inferCityFromText } from '../utils/inferCity'

const FORM_ENDPOINT = `https://formsubmit.co/ajax/${BUSINESS.email}`
const INGEST_ENDPOINT = '/api/leads'

/**
 * Persist lead to private Redis CRM. Never logs or returns customer fields.
 * @returns {Promise<{ ok: boolean, id?: string, linked?: boolean }>}
 */
async function ingestLead(payload) {
  const res = await fetch(INGEST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Lead save failed')
    err.status = res.status
    throw err
  }
  return data
}

async function sendFormSubmitEmail({ name, phone, email, address, service, message, subject }) {
  const data = {
    name,
    phone,
    email,
    address,
    service,
    message,
    _subject: subject ?? `Free Quote Request — ${BUSINESS.name}`,
    _template: 'table',
    _captcha: 'false',
  }

  const res = await fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) throw new Error('Submission failed')
  return res.json()
}

/**
 * Dual-write: Redis CRM lead + FormSubmit email notification.
 * Only call after client-side validation has passed.
 *
 * @param {object} fields
 * @param {'instant_quote'|'contact'|'booking'} fields.source
 * @param {string} [fields.companyWebsite] honeypot — must stay empty
 * @param {number} [fields.quotedAmount] structured quote amount (Instant Quote low end)
 * @param {string} [fields.linkedLeadId] existing Instant Quote lead to update (booking)
 * @param {string} [fields.preferredDate] booking preferred date YYYY-MM-DD
 * @param {string} [fields.timeWindow] morning|afternoon|evening|custom
 * @param {string} [fields.customTime]
 * @returns {Promise<{ ok: boolean, id?: string, linked?: boolean }>}
 */
export async function submitLead({
  name,
  phone,
  email,
  address,
  service,
  message,
  subject,
  source = 'contact',
  city = null,
  companyWebsite = '',
  quotedAmount = undefined,
  linkedLeadId = undefined,
  preferredDate = undefined,
  timeWindow = undefined,
  customTime = undefined,
}) {
  // Silent drop for honeypot fills — no Redis lead, no email
  if (String(companyWebsite || '').trim()) {
    return { ok: true }
  }

  const attribution = getLeadAttribution()
  const resolvedCity =
    city ||
    inferCityFromText(address, attribution.conversionPage, attribution.originalLandingPage)

  const payload = {
    source,
    name,
    phone,
    email,
    address,
    service,
    message,
    city: resolvedCity,
    companyWebsite: '',
    ...attribution,
  }

  if (quotedAmount !== undefined && quotedAmount !== null && quotedAmount !== '') {
    payload.quotedAmount = quotedAmount
  }
  if (linkedLeadId) payload.linkedLeadId = linkedLeadId
  if (preferredDate) payload.preferredDate = preferredDate
  if (timeWindow) payload.timeWindow = timeWindow
  if (customTime) payload.customTime = customTime

  // Save CRM first so a failed email still leaves an admin-visible lead when possible.
  // Require both to succeed so the visitor knows if something went wrong.
  const ingest = await ingestLead(payload)

  await sendFormSubmitEmail({
    name,
    phone,
    email,
    address,
    service,
    message,
    subject,
  })

  return { ok: true, id: ingest.id, linked: Boolean(ingest.linked) }
}
