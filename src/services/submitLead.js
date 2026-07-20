import { BUSINESS } from '../config/business'
import { getLeadAttribution } from '../utils/analytics'
import { inferCityFromText } from '../utils/inferCity'

const FORM_ENDPOINT = `https://formsubmit.co/ajax/${BUSINESS.email}`
const INGEST_ENDPOINT = '/api/leads/ingest'

/**
 * Persist lead to private Redis CRM. Never logs or returns customer fields.
 * @returns {Promise<{ ok: boolean, id?: string }>}
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
}) {
  // Silent drop for honeypot fills — no Redis lead, no email
  if (String(companyWebsite || '').trim()) {
    return { ok: true }
  }

  const attribution = getLeadAttribution()
  const resolvedCity =
    city ||
    inferCityFromText(address, attribution.conversionPage, attribution.originalLandingPage)

  // Save CRM first so a failed email still leaves an admin-visible lead when possible.
  // Require both to succeed so the visitor knows if something went wrong.
  await ingestLead({
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
  })

  return sendFormSubmitEmail({
    name,
    phone,
    email,
    address,
    service,
    message,
    subject,
  })
}
