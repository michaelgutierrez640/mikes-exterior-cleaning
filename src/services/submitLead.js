import { BUSINESS } from '../config/business'
import { getLeadAttribution } from '../utils/analytics'
import { inferCityFromText } from '../utils/inferCity'

const FORM_ENDPOINT = `https://formsubmit.co/ajax/${BUSINESS.email}`
const INGEST_ENDPOINT = '/api/leads'
const ATTACH_PHOTOS_ENDPOINT = '/api/leads/attach-photos'

/**
 * Persist lead to private Redis CRM. Never logs or returns customer fields.
 * @returns {Promise<{ ok: boolean, id?: string, linked?: boolean, idempotent?: boolean }>}
 */
export async function ingestLead(payload, { signal } = {}) {
  const res = await fetch(INGEST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Lead save failed')
    err.status = res.status
    throw err
  }
  return data
}

/**
 * Attach uploaded Blob photos to an existing lead (idempotency-gated).
 */
export async function attachLeadPhotos(
  { leadId, idempotencyKey, photos = [], photoWarning = null },
  { signal } = {},
) {
  const res = await fetch(ATTACH_PHOTOS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      leadId,
      idempotencyKey,
      photos,
      photoWarning,
    }),
    signal,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Photo attach failed')
    err.status = res.status
    throw err
  }
  return data
}

export async function sendFormSubmitEmail({ name, phone, email, address, service, message, subject }, { signal } = {}) {
  const data = {
    name,
    phone,
    email: email || '(not provided)',
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
    signal,
  })

  if (!res.ok) throw new Error('Submission failed')
  return res.json()
}

function buildAttributionPayload({
  name,
  phone,
  email,
  address,
  service,
  message,
  source = 'contact',
  city = null,
  companyWebsite = '',
  quotedAmount = undefined,
  linkedLeadId = undefined,
  preferredDate = undefined,
  timeWindow = undefined,
  customTime = undefined,
  smsConsent = false,
  photos = undefined,
  problems = undefined,
  idempotencyKey = undefined,
  photoWarning = undefined,
}) {
  const attribution = getLeadAttribution()
  const resolvedCity =
    city ||
    inferCityFromText(address, attribution.conversionPage, attribution.originalLandingPage)

  const payload = {
    source,
    name,
    phone,
    email: email || null,
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
  // Only forward explicit true — omit/false must never look like consent server-side.
  if (smsConsent === true) payload.smsConsent = true
  if (Array.isArray(photos) && photos.length) {
    payload.photos = photos
  }
  if (Array.isArray(problems)) {
    payload.problems = problems
  }
  if (idempotencyKey) payload.idempotencyKey = idempotencyKey
  if (photoWarning) payload.photoWarning = photoWarning

  // Honeypot must stay empty on the wire; callers should short-circuit when filled.
  void companyWebsite
  return payload
}

/**
 * Dual-write: Redis CRM lead + FormSubmit email notification.
 * Only call after client-side validation has passed.
 *
 * @param {object} fields
 * @param {'instant_quote'|'contact'|'booking'|'pigeon_guard_landing'} fields.source
 * @param {string} [fields.companyWebsite] honeypot — must stay empty
 * @param {number} [fields.quotedAmount] structured quote amount (Instant Quote low end)
 * @param {string} [fields.linkedLeadId] existing Instant Quote lead to update (booking)
 * @param {string} [fields.preferredDate] booking preferred date YYYY-MM-DD
 * @param {string} [fields.timeWindow] morning|afternoon|evening|custom
 * @param {string} [fields.customTime]
 * @param {boolean} [fields.smsConsent] explicit transactional SMS opt-in (never required)
 * @param {Array<object>} [fields.photos] blob photo metadata (lead-photos/)
 * @param {string[]} [fields.problems] multi-select problem descriptions (pigeon landing)
 * @param {string} [fields.idempotencyKey] retry-safe create key
 * @returns {Promise<{ ok: boolean, id?: string, linked?: boolean, idempotent?: boolean }>}
 */
export async function submitLead(fields) {
  // Silent drop for honeypot fills — no Redis lead, no email
  if (String(fields.companyWebsite || '').trim()) {
    return { ok: true }
  }

  const payload = buildAttributionPayload(fields)

  // Save CRM first so a failed email still leaves an admin-visible lead when possible.
  // Require both to succeed so the visitor knows if something went wrong.
  const ingest = await ingestLead(payload)

  await sendFormSubmitEmail({
    name: fields.name,
    phone: fields.phone,
    email: fields.email,
    address: fields.address,
    service: fields.service,
    message: fields.message,
    subject: fields.subject,
  })

  return { ok: true, id: ingest.id, linked: Boolean(ingest.linked), idempotent: Boolean(ingest.idempotent) }
}

/**
 * CRM-only create used by pigeon-guard hardened submit (email is best-effort separately).
 */
export async function createCrmLead(fields, { signal } = {}) {
  if (String(fields.companyWebsite || '').trim()) {
    return { ok: true, honeypot: true }
  }
  const payload = buildAttributionPayload(fields)
  return ingestLead(payload, { signal })
}
