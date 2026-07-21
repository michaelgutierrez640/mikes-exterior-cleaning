import crypto from 'crypto'
import { getAnalyticsRedis, isAnalyticsStorageConfigured } from './analyticsRedis.mjs'

export const LEAD_KEY_PREFIX = 'lead:'
export const LEADS_ALL_KEY = 'leads:all'
export const LEADS_RATE_PREFIX = 'leads:ratelimit:'

export const LEAD_SOURCES = ['instant_quote', 'contact', 'booking']

export const LEAD_STATUSES = [
  'New Lead',
  'Contacted',
  'Estimate Scheduled',
  'Estimate Sent',
  'Booked',
  'Completed',
  'Lost',
]

export const DEFAULT_LEAD_STATUS = 'New Lead'
export const TERMINAL_LEAD_STATUSES = ['Completed', 'Lost']
export const MAX_LEADS_LIST = 1000
export const MAX_MESSAGE_LENGTH = 8000
export const MAX_NOTES_LENGTH = 4000
export const MAX_FOLLOW_UP_NOTE_LENGTH = 500
export const MAX_NOTE_ENTRIES = 100
export const MAX_STATUS_HISTORY = 50

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
 * Create a lead from a validated public ingest payload.
 */
export async function createLeadFromIngest(validated) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    const err = new Error('Leads storage not configured')
    err.status = 503
    throw err
  }

  const id = newLeadId()
  const at = nowIso()
  const lead = {
    id,
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
    createdAt: at,
    updatedAt: at,
  }

  await writeLead(redis, lead)
  const score = Date.parse(at) || Date.now()
  await redis.zadd(LEADS_ALL_KEY, { score, member: id })

  return { id, createdAt: at }
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

    // dueThisWeek = today + upcoming within the next 7 calendar days (excludes overdue)
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
 */
export function filterLeads(leads, {
  status = '',
  source = '',
  q = '',
  service = '',
  city = '',
  followUp = '',
} = {}) {
  const today = todayDateKey()
  const query = String(q || '').trim().toLowerCase()
  const statusFilter = String(status || '').trim()
  const sourceFilter = String(source || '').trim()
  const serviceFilter = String(service || '').trim().toLowerCase()
  const cityFilter = String(city || '').trim().toLowerCase()
  const followUpFilter = String(followUp || '').trim().toLowerCase()

  let filtered = (leads || []).filter((lead) => {
    if (statusFilter && lead.status !== statusFilter) return false
    if (sourceFilter && lead.source !== sourceFilter) return false
    if (serviceFilter && !(lead.service || '').toLowerCase().includes(serviceFilter)) return false
    if (cityFilter && !(lead.city || '').toLowerCase().includes(cityFilter)) return false
    if (query) {
      const hay = [lead.name, lead.phone, lead.email, lead.service, lead.city, lead.message, lead.followUpNote]
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
  return {
    leads: filterLeads(all, filters),
    followUpSummary: buildFollowUpSummary(all),
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

/**
 * Admin update: status, note, and/or follow-up reminder fields.
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

  const at = nowIso()
  let changed = false

  if (input.status !== undefined) {
    const status = String(input.status || '').trim()
    if (!LEAD_STATUSES.includes(status)) {
      const err = new Error('Invalid status')
      err.status = 400
      throw err
    }
    if (status !== existing.status) {
      existing.status = status
      const history = Array.isArray(existing.statusHistory) ? existing.statusHistory : []
      history.push({ status, at, by: 'admin' })
      existing.statusHistory = history.slice(-MAX_STATUS_HISTORY)
      changed = true

      if (TERMINAL_LEAD_STATUSES.includes(status)) {
        clearActiveFollowUp(existing, at)
      }
    }
  }

  if (input.note !== undefined) {
    const text = trimStr(input.note, MAX_NOTES_LENGTH)
    if (!text) {
      const err = new Error('Note cannot be empty')
      err.status = 400
      throw err
    }
    const notes = Array.isArray(existing.notes) ? existing.notes : []
    notes.push({ id: newNoteId(), text, at })
    existing.notes = notes.slice(-MAX_NOTE_ENTRIES)
    changed = true
  }

  const touchingFollowUp =
    input.followUpDate !== undefined ||
    input.followUpNote !== undefined ||
    input.clearFollowUp === true

  if (touchingFollowUp) {
    if (input.clearFollowUp === true) {
      existing.followUpDate = null
      existing.followUpNote = null
      existing.followUpCompletedAt = at
      changed = true
    } else {
      if (input.followUpDate !== undefined) {
        const normalized = normalizeFollowUpDate(input.followUpDate)
        if (!normalized.ok) {
          const err = new Error(normalized.error)
          err.status = 400
          throw err
        }
        existing.followUpDate = normalized.value
        if (normalized.value) {
          existing.followUpCompletedAt = null
        }
        changed = true
      }
      if (input.followUpNote !== undefined) {
        existing.followUpNote = trimStr(input.followUpNote, MAX_FOLLOW_UP_NOTE_LENGTH)
        changed = true
      }
      // Setting a date without explicit clear reactivates the reminder
      if (existing.followUpDate) {
        existing.followUpCompletedAt = null
      }
    }
  }

  if (!changed) return existing

  existing.updatedAt = at
  await writeLead(redis, existing)
  return existing
}

/** Inbox row shape — full PII only for authenticated admin clients. */
export function toLeadListItem(lead, today = todayDateKey()) {
  const followUpBadge = getFollowUpBadge(lead, today)
  return {
    id: lead.id,
    source: lead.source,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    service: lead.service,
    city: lead.city,
    status: lead.status,
    followUpDate: lead.followUpDate || null,
    followUpNote: lead.followUpNote || null,
    followUpCompletedAt: lead.followUpCompletedAt || null,
    followUpBadge,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  }
}
