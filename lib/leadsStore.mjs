import crypto from 'crypto'
import { getAnalyticsRedis, isAnalyticsStorageConfigured } from './analyticsRedis.mjs'

export const LEAD_KEY_PREFIX = 'lead:'
export const LEADS_ALL_KEY = 'leads:all'
export const LEADS_RATE_PREFIX = 'leads:ratelimit:'

/** Canonical pipeline statuses (Phase 1). */
export const LEAD_STATUSES = ['New', 'Contacted', 'Booked', 'Completed', 'Lost']

export const DEFAULT_LEAD_STATUS = 'New'
export const TERMINAL_LEAD_STATUSES = ['Completed', 'Lost']

/** Admin inbox buckets — Active excludes Completed/Lost; never deletes records. */
export const INBOX_VIEWS = ['active', 'completed', 'all']
export const DEFAULT_INBOX_VIEW = 'active'
export const ACTIVE_LEAD_STATUSES = ['New', 'Contacted', 'Booked']

/**
 * Map legacy Redis values → canonical statuses.
 * Older leads may still store these strings until the next admin save.
 */
export const LEGACY_STATUS_MAP = {
  'New Lead': 'New',
  'Estimate Scheduled': 'Contacted',
  'Estimate Sent': 'Contacted',
}

export const LEAD_SOURCES = ['instant_quote', 'contact', 'booking']

export const APPOINTMENT_STATUSES = ['none', 'requested', 'confirmed', 'cancelled', 'completed']
export const DEFAULT_APPOINTMENT_TIMEZONE = 'America/Los_Angeles'
export const DEFAULT_APPOINTMENT_STATUS = 'none'

export const PAYMENT_STATUSES = ['unpaid', 'deposit', 'paid', 'refunded', 'na']
export const DEFAULT_PAYMENT_STATUS = 'unpaid'

export const MAX_LEADS_LIST = 1000
export const MAX_MESSAGE_LENGTH = 8000
export const MAX_NOTES_LENGTH = 4000
export const MAX_FOLLOW_UP_NOTE_LENGTH = 500
export const MAX_INTERNAL_NOTES_LENGTH = 4000
export const MAX_APPOINTMENT_NOTES_LENGTH = 1000
export const MAX_NOTE_ENTRIES = 100
export const MAX_STATUS_HISTORY = 50
export const MAX_MONEY = 1000000

/** Preferred booking window → default start time (24h HH:MM). */
export const TIME_WINDOW_STARTS = {
  morning: '08:00',
  afternoon: '12:00',
  evening: '16:00',
  custom: null,
}

export const DEFAULT_AUTOMATION_STATE = {
  quoteReceivedSmsAt: null,
  ownerNewLeadSmsAt: null,
  bookingConfirmSmsAt: null,
  reminderSmsAt: null,
  reviewRequestSmsAt: null,
  reviewRequestDueAt: null,
}

/** Calendar date YYYY-MM-DD in America/Los_Angeles (business timezone). */
export function todayDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function addDaysToDateKey(dateKey, days) {
  const d = new Date(`${dateKey}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Normalize follow-up date to YYYY-MM-DD or null.
 * @returns {{ ok: true, value: string|null } | { ok: false, error: string }}
 */
export function normalizeFollowUpDate(value) {
  if (value === null || value === undefined || value === '') {
    return { ok: true, value: null }
  }
  const s = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { ok: false, error: 'Follow-up date must be YYYY-MM-DD' }
  }
  const parsed = Date.parse(`${s}T12:00:00.000Z`)
  if (Number.isNaN(parsed)) {
    return { ok: false, error: 'Invalid follow-up date' }
  }
  return { ok: true, value: s }
}

/**
 * Derive follow-up badge: overdue | today | upcoming | completed | none
 */
export function getFollowUpBadge(lead, today = todayDateKey()) {
  const date = lead?.followUpDate || null
  if (date) {
    if (date < today) return 'overdue'
    if (date === today) return 'today'
    return 'upcoming'
  }
  if (lead?.followUpCompletedAt) return 'completed'
  return 'none'
}

export function isFollowUpInThisWeek(dateKey, today = todayDateKey()) {
  if (!dateKey) return false
  const end = addDaysToDateKey(today, 6)
  return dateKey >= today && dateKey <= end
}

export function followUpSortRank(badge) {
  if (badge === 'overdue') return 0
  if (badge === 'today') return 1
  if (badge === 'upcoming') return 2
  if (badge === 'completed') return 3
  return 4
}

/** @returns {boolean} */
export function isLeadsStorageConfigured() {
  return isAnalyticsStorageConfigured()
}

function leadKey(id) {
  return `${LEAD_KEY_PREFIX}${id}`
}

export function normalizeLeadId(value) {
  let id = String(value ?? '').trim()
  if (!id) return ''
  if (
    (id.startsWith('"') && id.endsWith('"')) ||
    (id.startsWith("'") && id.endsWith("'"))
  ) {
    id = id.slice(1, -1).trim()
  }
  if (id.startsWith(LEAD_KEY_PREFIX)) id = id.slice(LEAD_KEY_PREFIX.length)
  return id.slice(0, 80)
}

function nowIso() {
  return new Date().toISOString()
}

function newLeadId() {
  return `lead_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`
}

function newNoteId() {
  return `note_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`
}

function trimStr(value, max) {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  return s.slice(0, max)
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidPhone(phone) {
  const digits = String(phone).replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

export function phoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '')
}

export function emailsMatch(a, b) {
  return String(a || '')
    .trim()
    .toLowerCase() ===
    String(b || '')
      .trim()
      .toLowerCase()
}

export function phonesMatch(a, b) {
  const da = phoneDigits(a)
  const db = phoneDigits(b)
  if (!da || !db) return false
  return da === db || da.endsWith(db) || db.endsWith(da)
}

/** Map any stored status string to the canonical pipeline value. */
export function getCanonicalStatus(status) {
  const s = String(status || '').trim()
  if (!s) return DEFAULT_LEAD_STATUS
  if (LEAD_STATUSES.includes(s)) return s
  if (LEGACY_STATUS_MAP[s]) return LEGACY_STATUS_MAP[s]
  return s
}

/** Normalize inbox view query; unknown values fall back to active. */
export function normalizeInboxView(value) {
  const v = String(value || '').trim().toLowerCase()
  if (INBOX_VIEWS.includes(v)) return v
  return DEFAULT_INBOX_VIEW
}

/**
 * Whether a lead belongs in an admin inbox view.
 * Completed/Lost are never deleted — only excluded from the Active view.
 */
export function matchesInboxView(lead, inboxView = DEFAULT_INBOX_VIEW) {
  const view = normalizeInboxView(inboxView)
  const status = getCanonicalStatus(lead?.status)
  if (view === 'all') return true
  if (view === 'completed') return status === 'Completed'
  return ACTIVE_LEAD_STATUSES.includes(status)
}

/**
 * Partition leads for the Active follow-up board WITHOUT dropping any lead.
 * Bug fixed: followUpBadge === 'completed' (follow-up cleared) used to vanish from the UI.
 */
export function partitionActiveInboxLeads(leads, today = todayDateKey()) {
  const overdue = []
  const dueToday = []
  const upcoming = []
  const other = []

  for (const lead of leads || []) {
    const badge = getFollowUpBadge(lead, today)
    if (badge === 'overdue') overdue.push(lead)
    else if (badge === 'today') dueToday.push(lead)
    else if (badge === 'upcoming') upcoming.push(lead)
    else other.push(lead) // includes follow-up badge none/completed — never omit
  }

  const byDate = (a, b) => String(a.followUpDate || '').localeCompare(String(b.followUpDate || ''))
  overdue.sort(byDate)
  dueToday.sort(byDate)
  upcoming.sort(byDate)
  other.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

  return { overdue, dueToday, upcoming, other }
}

/**
 * Parse money for storage. Empty/null clears. Rejects negatives and non-finite values.
 * @returns {{ ok: true, value: number|null } | { ok: false, error: string }}
 */
export function parseMoneyAmount(value, fieldLabel = 'Amount') {
  if (value === null || value === undefined || value === '') {
    return { ok: true, value: null }
  }
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/[$,\s]/g, '')
    if (!cleaned) return { ok: true, value: null }
    const n = Number(cleaned)
    if (!Number.isFinite(n)) return { ok: false, error: `${fieldLabel} must be a valid number` }
    return finalizeMoney(n, fieldLabel)
  }
  const n = Number(value)
  if (!Number.isFinite(n)) return { ok: false, error: `${fieldLabel} must be a valid number` }
  return finalizeMoney(n, fieldLabel)
}

function finalizeMoney(n, fieldLabel) {
  if (n < 0) return { ok: false, error: `${fieldLabel} cannot be negative` }
  if (n > MAX_MONEY) return { ok: false, error: `${fieldLabel} is too large` }
  // Store cents-safe 2 decimal places
  const rounded = Math.round(n * 100) / 100
  return { ok: true, value: rounded }
}

/**
 * @returns {{ ok: true, value: string|null } | { ok: false, error: string }}
 */
export function normalizeAppointmentDate(value) {
  if (value === null || value === undefined || value === '') {
    return { ok: true, value: null }
  }
  const s = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { ok: false, error: 'Appointment date must be YYYY-MM-DD' }
  }
  const parsed = Date.parse(`${s}T12:00:00.000Z`)
  if (Number.isNaN(parsed)) {
    return { ok: false, error: 'Invalid appointment date' }
  }
  return { ok: true, value: s }
}

/**
 * Accept HH:MM (24h) or H:MM.
 * @returns {{ ok: true, value: string|null } | { ok: false, error: string }}
 */
export function normalizeAppointmentStartTime(value) {
  if (value === null || value === undefined || value === '') {
    return { ok: true, value: null }
  }
  const s = String(value).trim()
  const m = s.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return { ok: false, error: 'Appointment start time must be HH:MM' }
  const hh = Number(m[1])
  const mm = Number(m[2])
  if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return { ok: false, error: 'Appointment start time must be a valid 24-hour time' }
  }
  return { ok: true, value: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` }
}

export function normalizeAppointmentStatus(value) {
  if (value === null || value === undefined || value === '') {
    return { ok: true, value: DEFAULT_APPOINTMENT_STATUS }
  }
  const s = String(value).trim().toLowerCase()
  if (!APPOINTMENT_STATUSES.includes(s)) {
    return { ok: false, error: 'Invalid appointment status' }
  }
  return { ok: true, value: s }
}

export function normalizePaymentStatus(value) {
  if (value === null || value === undefined || value === '') {
    return { ok: true, value: null }
  }
  const s = String(value).trim().toLowerCase()
  if (!PAYMENT_STATUSES.includes(s)) {
    return { ok: false, error: 'Invalid payment status' }
  }
  return { ok: true, value: s }
}

export function startTimeFromTimeWindow(windowId, customTime = '') {
  const id = String(windowId || '').trim()
  if (id === 'custom') {
    const custom = String(customTime || '').trim()
    // Prefer parsing "8:00 AM" style later; for Phase 1 leave null when custom text only
    if (/^\d{1,2}:\d{2}$/.test(custom)) {
      const normalized = normalizeAppointmentStartTime(custom)
      return normalized.ok ? normalized.value : null
    }
    return null
  }
  return TIME_WINDOW_STARTS[id] ?? null
}

function defaultAutomationState(raw) {
  const base = { ...DEFAULT_AUTOMATION_STATE }
  if (!raw || typeof raw !== 'object') return base
  for (const key of Object.keys(DEFAULT_AUTOMATION_STATE)) {
    if (raw[key] !== undefined) base[key] = raw[key] ?? null
  }
  return base
}

/**
 * Present a lead for admin clients: canonical status + safe defaults for new fields.
 * Does not mutate Redis; older records keep legacy values until the next write.
 */
export function presentLead(lead) {
  if (!lead) return null
  const status = getCanonicalStatus(lead.status)
  const history = Array.isArray(lead.statusHistory)
    ? lead.statusHistory.map((h) => ({
        ...h,
        status: getCanonicalStatus(h?.status),
        storedStatus: h?.status ?? null,
      }))
    : []

  return {
    ...lead,
    status,
    statusHistory: history,
    appointmentDate: lead.appointmentDate ?? null,
    appointmentStartTime: lead.appointmentStartTime ?? null,
    appointmentTimezone: lead.appointmentTimezone || DEFAULT_APPOINTMENT_TIMEZONE,
    appointmentStatus: lead.appointmentStatus || DEFAULT_APPOINTMENT_STATUS,
    appointmentNotes: lead.appointmentNotes ?? null,
    appointmentConfirmedAt: lead.appointmentConfirmedAt ?? null,
    quotedAmount: lead.quotedAmount ?? null,
    bookedAmount: lead.bookedAmount ?? null,
    completedRevenue: lead.completedRevenue ?? null,
    paymentStatus: lead.paymentStatus ?? null,
    internalNotes: lead.internalNotes ?? null,
    bookingLinkedAt: lead.bookingLinkedAt ?? null,
    automationState: defaultAutomationState(lead.automationState),
  }
}

function buildNewLeadFields(validated, at) {
  return {
    id: newLeadId(),
    source: validated.source,
    name: validated.name,
    phone: validated.phone,
    email: validated.email,
    service: validated.service,
    city: validated.city,
    message: validated.message,
    address: validated.address,
    originalLandingPage: validated.originalLandingPage,
    conversionPage: validated.conversionPage,
    referrer: validated.referrer,
    utmSource: validated.utmSource,
    utmMedium: validated.utmMedium,
    utmCampaign: validated.utmCampaign,
    utmTerm: validated.utmTerm,
    utmContent: validated.utmContent,
    status: DEFAULT_LEAD_STATUS,
    notes: [],
    statusHistory: [{ status: DEFAULT_LEAD_STATUS, at, by: 'system' }],
    followUpDate: null,
    followUpNote: null,
    followUpCompletedAt: null,
    appointmentDate: validated.appointmentDate ?? null,
    appointmentStartTime: validated.appointmentStartTime ?? null,
    appointmentTimezone: validated.appointmentTimezone || DEFAULT_APPOINTMENT_TIMEZONE,
    appointmentStatus: validated.appointmentStatus || DEFAULT_APPOINTMENT_STATUS,
    appointmentNotes: validated.appointmentNotes ?? null,
    appointmentConfirmedAt: null,
    quotedAmount: validated.quotedAmount ?? null,
    bookedAmount: null,
    completedRevenue: null,
    paymentStatus: null,
    internalNotes: null,
    bookingLinkedAt: null,
    automationState: { ...DEFAULT_AUTOMATION_STATE },
    createdAt: at,
    updatedAt: at,
  }
}

/**
 * Validate public ingest payload. Rejects honeypot / incomplete spam.
 * @returns {{ ok: true, data: object } | { ok: false, error: string, status?: number }}
 */
export function validateLeadIngest(input = {}) {
  // Honeypot — bots fill hidden fields; humans leave empty
  const honey = String(input.companyWebsite || input.website || input._gotcha || '').trim()
  if (honey) {
    return { ok: false, error: 'Rejected', status: 204 }
  }

  const source = String(input.source || '').trim()
  if (!LEAD_SOURCES.includes(source)) {
    return { ok: false, error: 'Invalid lead source', status: 400 }
  }

  const name = trimStr(input.name, 120)
  const phone = trimStr(input.phone, 40)
  const email = trimStr(input.email, 160)?.toLowerCase() || null

  if (!name) return { ok: false, error: 'Name is required', status: 400 }
  if (!phone || !isValidPhone(phone)) return { ok: false, error: 'Valid phone is required', status: 400 }
  if (!email || !isValidEmail(email)) return { ok: false, error: 'Valid email is required', status: 400 }

  let quotedAmount = null
  if (input.quotedAmount !== undefined && input.quotedAmount !== null && input.quotedAmount !== '') {
    const money = parseMoneyAmount(input.quotedAmount, 'Quoted amount')
    if (!money.ok) return { ok: false, error: money.error, status: 400 }
    quotedAmount = money.value
  }

  const linkedLeadId = normalizeLeadId(input.linkedLeadId || input.leadId || '')

  let appointmentDate = null
  let appointmentStartTime = null
  let appointmentStatus = DEFAULT_APPOINTMENT_STATUS
  let appointmentNotes = null

  if (input.appointmentDate !== undefined && input.appointmentDate !== null && input.appointmentDate !== '') {
    const d = normalizeAppointmentDate(input.appointmentDate)
    if (!d.ok) return { ok: false, error: d.error, status: 400 }
    appointmentDate = d.value
  } else if (input.preferredDate) {
    const d = normalizeAppointmentDate(input.preferredDate)
    if (!d.ok) return { ok: false, error: d.error, status: 400 }
    appointmentDate = d.value
  }

  if (input.appointmentStartTime !== undefined && input.appointmentStartTime !== null && input.appointmentStartTime !== '') {
    const t = normalizeAppointmentStartTime(input.appointmentStartTime)
    if (!t.ok) return { ok: false, error: t.error, status: 400 }
    appointmentStartTime = t.value
  } else if (input.timeWindow || input.preferredTimeWindow) {
    appointmentStartTime = startTimeFromTimeWindow(
      input.timeWindow || input.preferredTimeWindow,
      input.customTime || input.preferredCustomTime || '',
    )
  }

  if (source === 'booking' && appointmentDate) {
    appointmentStatus = 'requested'
  }

  if (input.appointmentNotes !== undefined) {
    appointmentNotes = trimStr(input.appointmentNotes, MAX_APPOINTMENT_NOTES_LENGTH)
  }

  return {
    ok: true,
    data: {
      source,
      name,
      phone,
      email,
      service: trimStr(input.service, 200),
      city: trimStr(input.city, 80),
      message: trimStr(input.message, MAX_MESSAGE_LENGTH),
      address: trimStr(input.address, 300),
      originalLandingPage: trimStr(input.originalLandingPage, 500),
      conversionPage: trimStr(input.conversionPage, 500),
      referrer: trimStr(input.referrer, 500),
      utmSource: trimStr(input.utmSource, 100),
      utmMedium: trimStr(input.utmMedium, 100),
      utmCampaign: trimStr(input.utmCampaign, 160),
      utmTerm: trimStr(input.utmTerm, 160),
      utmContent: trimStr(input.utmContent, 160),
      quotedAmount,
      linkedLeadId: linkedLeadId || null,
      appointmentDate,
      appointmentStartTime,
      appointmentTimezone: DEFAULT_APPOINTMENT_TIMEZONE,
      appointmentStatus,
      appointmentNotes,
    },
  }
}

async function readLead(redis, id) {
  const raw = await redis.get(leadKey(id))
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function writeLead(redis, lead) {
  await redis.set(leadKey(lead.id), JSON.stringify(lead))
}

/**
 * Simple sliding-window rate limit: max `limit` creates per IP per `windowSec`.
 * @returns {{ allowed: boolean, remaining: number }}
 */
export async function checkLeadIngestRateLimit(ip, { limit = 8, windowSec = 3600 } = {}) {
  const redis = getAnalyticsRedis()
  if (!redis || !ip) return { allowed: true, remaining: limit }

  const key = `${LEADS_RATE_PREFIX}${ip}`
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, windowSec)
  }
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
}

/**
 * Link a booking request onto an existing Instant Quote lead when phone+email match.
 * Falls back to creating a new lead if the link is invalid (never blocks the customer).
 */
async function linkBookingToExistingLead(redis, validated) {
  const existing = await readLead(redis, validated.linkedLeadId)
  if (!existing) {
    console.info('[leads] link missed — lead not found; creating new', { id: validated.linkedLeadId })
    return null
  }
  if (!phonesMatch(existing.phone, validated.phone) || !emailsMatch(existing.email, validated.email)) {
    console.info('[leads] link missed — contact mismatch; creating new', { id: validated.linkedLeadId })
    return null
  }

  const at = nowIso()
  if (validated.service) existing.service = validated.service
  if (validated.address) existing.address = validated.address
  if (validated.city) existing.city = validated.city
  if (validated.message) {
    const notes = Array.isArray(existing.notes) ? existing.notes : []
    notes.push({
      id: newNoteId(),
      text: `Website booking request:\n${validated.message}`,
      at,
    })
    existing.notes = notes.slice(-MAX_NOTE_ENTRIES)
  }

  if (validated.appointmentDate) {
    existing.appointmentDate = validated.appointmentDate
    existing.appointmentStartTime = validated.appointmentStartTime ?? existing.appointmentStartTime ?? null
    existing.appointmentTimezone = DEFAULT_APPOINTMENT_TIMEZONE
    existing.appointmentStatus = 'requested'
    if (validated.appointmentNotes) {
      existing.appointmentNotes = validated.appointmentNotes
    }
  }

  if (validated.quotedAmount != null && existing.quotedAmount == null) {
    existing.quotedAmount = validated.quotedAmount
  }

  existing.bookingLinkedAt = at
  existing.updatedAt = at
  if (!existing.automationState) existing.automationState = { ...DEFAULT_AUTOMATION_STATE }

  // Do not auto-advance to Booked — Mike confirms in admin.
  await writeLead(redis, existing)
  return { id: existing.id, createdAt: existing.createdAt, linked: true }
}

/**
 * Create a lead from a validated public ingest payload.
 * When `linkedLeadId` is present (booking after Instant Quote), update that lead in place.
 */
export async function createLeadFromIngest(validated) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    const err = new Error('Leads storage not configured')
    err.status = 503
    throw err
  }

  if (validated.linkedLeadId && validated.source === 'booking') {
    const linked = await linkBookingToExistingLead(redis, validated)
    if (linked) return linked
  }

  const at = nowIso()
  const lead = buildNewLeadFields(validated, at)

  await writeLead(redis, lead)
  const score = Date.parse(at) || Date.now()
  await redis.zadd(LEADS_ALL_KEY, { score, member: lead.id })

  return { id: lead.id, createdAt: at, linked: false }
}

/**
 * Summarize follow-up urgency across leads (admin dashboard cards).
 */
export function buildFollowUpSummary(leads, today = todayDateKey()) {
  let overdue = 0
  let dueToday = 0
  let dueThisWeek = 0
  let upcoming = 0
  let noFollowUp = 0
  let completed = 0

  for (const lead of leads || []) {
    const badge = getFollowUpBadge(lead, today)
    if (badge === 'overdue') overdue += 1
    else if (badge === 'today') dueToday += 1
    else if (badge === 'upcoming') upcoming += 1
    else if (badge === 'completed') completed += 1
    else noFollowUp += 1

    if (badge === 'today' || (badge === 'upcoming' && isFollowUpInThisWeek(lead.followUpDate, today))) {
      dueThisWeek += 1
    }
  }

  return { overdue, dueToday, dueThisWeek, upcoming, noFollowUp, completed }
}

async function loadAllLeads(limit = MAX_LEADS_LIST) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    const err = new Error('Leads storage not configured')
    err.status = 503
    throw err
  }

  const ids = await redis.zrange(LEADS_ALL_KEY, 0, Math.max(0, Math.min(limit, MAX_LEADS_LIST) - 1), {
    rev: true,
  })

  const leads = []
  for (const rawId of ids || []) {
    const id = normalizeLeadId(rawId)
    if (!id) continue
    const lead = await readLead(redis, id)
    if (lead) leads.push(lead)
  }
  return leads
}

/**
 * Filter/sort an in-memory lead list (newest-first unless followUp filter set).
 * inboxView: active | completed | all — view filter never deletes Redis records.
 */
export function filterLeads(leads, {
  status = '',
  source = '',
  q = '',
  service = '',
  city = '',
  followUp = '',
  inboxView = '',
} = {}) {
  const today = todayDateKey()
  const query = String(q || '').trim().toLowerCase()
  const statusFilter = String(status || '').trim()
  const canonicalStatusFilter = statusFilter ? getCanonicalStatus(statusFilter) : ''
  const sourceFilter = String(source || '').trim()
  const serviceFilter = String(service || '').trim().toLowerCase()
  const cityFilter = String(city || '').trim().toLowerCase()
  const followUpFilter = String(followUp || '').trim().toLowerCase()
  const view = String(inboxView || '').trim() ? normalizeInboxView(inboxView) : ''

  let filtered = (leads || []).filter((lead) => {
    if (view && !matchesInboxView(lead, view)) return false
    if (canonicalStatusFilter && getCanonicalStatus(lead.status) !== canonicalStatusFilter) return false
    if (sourceFilter && lead.source !== sourceFilter) return false
    if (serviceFilter && !(lead.service || '').toLowerCase().includes(serviceFilter)) return false
    if (cityFilter && !(lead.city || '').toLowerCase().includes(cityFilter)) return false
    if (query) {
      const hay = [
        lead.name,
        lead.phone,
        lead.email,
        lead.service,
        lead.city,
        lead.message,
        lead.followUpNote,
        lead.internalNotes,
        lead.lostReason,
        lead.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(query)) return false
    }

    if (followUpFilter) {
      const badge = getFollowUpBadge(lead, today)
      if (followUpFilter === 'overdue' && badge !== 'overdue') return false
      if (followUpFilter === 'today' && badge !== 'today') return false
      if (followUpFilter === 'week') {
        const inWeek =
          badge === 'today' || (badge === 'upcoming' && isFollowUpInThisWeek(lead.followUpDate, today))
        if (!inWeek) return false
      }
      if (followUpFilter === 'none' && badge !== 'none') return false
      if (followUpFilter === 'upcoming' && badge !== 'upcoming') return false
      if (followUpFilter === 'completed' && badge !== 'completed') return false
    }
    return true
  })

  if (followUpFilter) {
    filtered = [...filtered].sort((a, b) => {
      const ba = getFollowUpBadge(a, today)
      const bb = getFollowUpBadge(b, today)
      const ra = followUpSortRank(ba)
      const rb = followUpSortRank(bb)
      if (ra !== rb) return ra - rb
      const da = a.followUpDate || '9999-99-99'
      const db = b.followUpDate || '9999-99-99'
      if (da !== db) return da.localeCompare(db)
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    })
  }

  return filtered
}

/**
 * List leads newest first (or follow-up urgency when filtering follow-ups).
 */
export async function listLeads(filters = {}) {
  const leads = await loadAllLeads(filters.limit)
  return filterLeads(leads, filters)
}

/** Load all leads once for admin list + summary. */
export async function listLeadsWithSummary(filters = {}) {
  const all = await loadAllLeads(filters.limit)
  // Follow-up cards always reflect Active pipeline leads (New/Contacted/Booked),
  // even when the list view is Completed or All.
  const activeLeads = filterLeads(all, { inboxView: 'active' })
  return {
    leads: filterLeads(all, filters),
    followUpSummary: buildFollowUpSummary(activeLeads),
    all,
  }
}

export async function getLead(id) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    const err = new Error('Leads storage not configured')
    err.status = 503
    throw err
  }
  const leadId = normalizeLeadId(id)
  if (!leadId) return null
  return readLead(redis, leadId)
}

function clearActiveFollowUp(existing, at) {
  if (existing.followUpDate) {
    existing.followUpDate = null
    existing.followUpCompletedAt = at
    return
  }
  if (!existing.followUpCompletedAt) {
    existing.followUpCompletedAt = at
  }
}

function hasOwn(input, key) {
  return Object.prototype.hasOwnProperty.call(input, key)
}

/**
 * Validate admin PATCH body fields (status, appointment, money, notes, follow-up).
 * @returns {{ ok: true, patch: object } | { ok: false, error: string }}
 */
export function validateLeadAdminUpdate(input = {}, existing = {}) {
  const patch = {}

  if (hasOwn(input, 'status')) {
    const status = String(input.status || '').trim()
    const canonical = getCanonicalStatus(status)
    // Accept canonical names or known legacy labels (mapped via getCanonicalStatus).
    if (!LEAD_STATUSES.includes(canonical)) {
      return { ok: false, error: 'Invalid status' }
    }
    patch.status = canonical
  }

  if (hasOwn(input, 'note')) {
    const text = trimStr(input.note, MAX_NOTES_LENGTH)
    if (!text) return { ok: false, error: 'Note cannot be empty' }
    patch.note = text
  }

  if (hasOwn(input, 'internalNotes')) {
    patch.internalNotes = trimStr(input.internalNotes, MAX_INTERNAL_NOTES_LENGTH)
  }

  if (hasOwn(input, 'appointmentDate')) {
    const d = normalizeAppointmentDate(input.appointmentDate)
    if (!d.ok) return { ok: false, error: d.error }
    patch.appointmentDate = d.value
  }
  if (hasOwn(input, 'appointmentStartTime')) {
    const t = normalizeAppointmentStartTime(input.appointmentStartTime)
    if (!t.ok) return { ok: false, error: t.error }
    patch.appointmentStartTime = t.value
  }
  if (hasOwn(input, 'appointmentTimezone')) {
    const tz = trimStr(input.appointmentTimezone, 80) || DEFAULT_APPOINTMENT_TIMEZONE
    patch.appointmentTimezone = tz
  }
  if (hasOwn(input, 'appointmentStatus')) {
    const s = normalizeAppointmentStatus(input.appointmentStatus)
    if (!s.ok) return { ok: false, error: s.error }
    patch.appointmentStatus = s.value
  }
  if (hasOwn(input, 'appointmentNotes')) {
    patch.appointmentNotes = trimStr(input.appointmentNotes, MAX_APPOINTMENT_NOTES_LENGTH)
  }

  if (hasOwn(input, 'quotedAmount')) {
    const m = parseMoneyAmount(input.quotedAmount, 'Quoted amount')
    if (!m.ok) return { ok: false, error: m.error }
    patch.quotedAmount = m.value
  }
  if (hasOwn(input, 'bookedAmount')) {
    const m = parseMoneyAmount(input.bookedAmount, 'Booked amount')
    if (!m.ok) return { ok: false, error: m.error }
    patch.bookedAmount = m.value
  }
  if (hasOwn(input, 'completedRevenue')) {
    const m = parseMoneyAmount(input.completedRevenue, 'Completed revenue')
    if (!m.ok) return { ok: false, error: m.error }
    patch.completedRevenue = m.value
  }
  if (hasOwn(input, 'paymentStatus')) {
    const p = normalizePaymentStatus(input.paymentStatus)
    if (!p.ok) return { ok: false, error: p.error }
    patch.paymentStatus = p.value
  }

  if (hasOwn(input, 'followUpDate') || hasOwn(input, 'followUpNote') || input.clearFollowUp === true) {
    patch.clearFollowUp = input.clearFollowUp === true
    if (hasOwn(input, 'followUpDate')) {
      const normalized = normalizeFollowUpDate(input.followUpDate)
      if (!normalized.ok) return { ok: false, error: normalized.error }
      patch.followUpDate = normalized.value
    }
    if (hasOwn(input, 'followUpNote')) {
      patch.followUpNote = trimStr(input.followUpNote, MAX_FOLLOW_UP_NOTE_LENGTH)
    }
  }

  const nextStatus = patch.status ?? getCanonicalStatus(existing.status)
  const nextDate = hasOwn(patch, 'appointmentDate') ? patch.appointmentDate : existing.appointmentDate ?? null
  const nextTime = hasOwn(patch, 'appointmentStartTime')
    ? patch.appointmentStartTime
    : existing.appointmentStartTime ?? null

  if (nextStatus === 'Booked') {
    if (!nextDate || !nextTime) {
      return {
        ok: false,
        error: 'Appointment date and start time are required when status is Booked',
      }
    }
  }

  return { ok: true, patch }
}

/**
 * Admin update: status, appointment, money, note, internal notes, and/or follow-up.
 * Only applies fields present on the input object (no undefined overwrites).
 */
export async function updateLead(id, input = {}) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    const err = new Error('Leads storage not configured')
    err.status = 503
    throw err
  }

  const leadId = normalizeLeadId(id)
  const existing = await readLead(redis, leadId)
  if (!existing) {
    const err = new Error('Lead not found')
    err.status = 404
    throw err
  }

  const validated = validateLeadAdminUpdate(input, existing)
  if (!validated.ok) {
    const err = new Error(validated.error)
    err.status = 400
    throw err
  }
  const patch = validated.patch
  const at = nowIso()
  let changed = false

  // Ensure new schema keys exist on older records when we write
  if (!existing.automationState) {
    existing.automationState = { ...DEFAULT_AUTOMATION_STATE }
    changed = true
  }
  if (!existing.appointmentTimezone) {
    existing.appointmentTimezone = DEFAULT_APPOINTMENT_TIMEZONE
  }

  if (patch.status !== undefined) {
    const current = getCanonicalStatus(existing.status)
    if (patch.status !== current || existing.status !== patch.status) {
      existing.status = patch.status
      const history = Array.isArray(existing.statusHistory) ? existing.statusHistory : []
      history.push({ status: patch.status, at, by: 'admin' })
      existing.statusHistory = history.slice(-MAX_STATUS_HISTORY)
      changed = true

      if (TERMINAL_LEAD_STATUSES.includes(patch.status)) {
        clearActiveFollowUp(existing, at)
      }

      if (patch.status === 'Booked') {
        existing.appointmentStatus = existing.appointmentStatus === 'cancelled'
          ? 'confirmed'
          : (patch.appointmentStatus || 'confirmed')
        if (!existing.appointmentConfirmedAt) {
          existing.appointmentConfirmedAt = at
        }
        if (!existing.appointmentTimezone) {
          existing.appointmentTimezone = DEFAULT_APPOINTMENT_TIMEZONE
        }
      }
    }
  }

  if (patch.note !== undefined) {
    const notes = Array.isArray(existing.notes) ? existing.notes : []
    notes.push({ id: newNoteId(), text: patch.note, at })
    existing.notes = notes.slice(-MAX_NOTE_ENTRIES)
    changed = true
  }

  if (patch.internalNotes !== undefined) {
    existing.internalNotes = patch.internalNotes
    changed = true
  }

  for (const key of [
    'appointmentDate',
    'appointmentStartTime',
    'appointmentTimezone',
    'appointmentStatus',
    'appointmentNotes',
    'quotedAmount',
    'bookedAmount',
    'completedRevenue',
    'paymentStatus',
  ]) {
    if (patch[key] !== undefined) {
      existing[key] = patch[key]
      changed = true
    }
  }

  // If becoming/keeping Booked and appointment just set, stamp confirmation time
  if (getCanonicalStatus(existing.status) === 'Booked') {
    if (!existing.appointmentConfirmedAt) {
      existing.appointmentConfirmedAt = at
      changed = true
    }
    if (!existing.appointmentStatus || existing.appointmentStatus === 'none' || existing.appointmentStatus === 'requested') {
      existing.appointmentStatus = 'confirmed'
      changed = true
    }
  }

  const touchingFollowUp =
    patch.followUpDate !== undefined ||
    patch.followUpNote !== undefined ||
    patch.clearFollowUp === true

  if (touchingFollowUp) {
    if (patch.clearFollowUp === true) {
      existing.followUpDate = null
      existing.followUpNote = null
      existing.followUpCompletedAt = at
      changed = true
    } else {
      if (patch.followUpDate !== undefined) {
        existing.followUpDate = patch.followUpDate
        if (patch.followUpDate) existing.followUpCompletedAt = null
        changed = true
      }
      if (patch.followUpNote !== undefined) {
        existing.followUpNote = patch.followUpNote
        changed = true
      }
      if (existing.followUpDate) {
        existing.followUpCompletedAt = null
      }
    }
  }

  if (!changed) return presentLead(existing)

  existing.updatedAt = at
  await writeLead(redis, existing)
  return presentLead(existing)
}

/** Inbox row shape — full PII only for authenticated admin clients. */
export function toLeadListItem(lead, today = todayDateKey()) {
  const presented = presentLead(lead)
  const followUpBadge = getFollowUpBadge(presented, today)
  return {
    id: presented.id,
    source: presented.source,
    name: presented.name,
    phone: presented.phone,
    email: presented.email,
    service: presented.service,
    city: presented.city,
    status: presented.status,
    appointmentDate: presented.appointmentDate,
    appointmentStartTime: presented.appointmentStartTime,
    appointmentStatus: presented.appointmentStatus,
    quotedAmount: presented.quotedAmount,
    bookedAmount: presented.bookedAmount,
    completedRevenue: presented.completedRevenue,
    paymentStatus: presented.paymentStatus,
    followUpDate: presented.followUpDate || null,
    followUpNote: presented.followUpNote || null,
    followUpCompletedAt: presented.followUpCompletedAt || null,
    followUpBadge,
    bookingLinkedAt: presented.bookingLinkedAt || null,
    createdAt: presented.createdAt,
    updatedAt: presented.updatedAt,
  }
}
