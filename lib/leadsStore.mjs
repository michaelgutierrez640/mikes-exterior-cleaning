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
export const MAX_LEADS_LIST = 1000
export const MAX_MESSAGE_LENGTH = 8000
export const MAX_NOTES_LENGTH = 4000
export const MAX_NOTE_ENTRIES = 100
export const MAX_STATUS_HISTORY = 50

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
    createdAt: at,
    updatedAt: at,
  }

  await writeLead(redis, lead)
  const score = Date.parse(at) || Date.now()
  await redis.zadd(LEADS_ALL_KEY, { score, member: id })

  return { id, createdAt: at }
}

/**
 * List leads newest first. Optional coarse filters applied in memory after fetch.
 */
export async function listLeads({
  status = '',
  source = '',
  q = '',
  service = '',
  city = '',
  limit = MAX_LEADS_LIST,
} = {}) {
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

  const query = String(q || '').trim().toLowerCase()
  const statusFilter = String(status || '').trim()
  const sourceFilter = String(source || '').trim()
  const serviceFilter = String(service || '').trim().toLowerCase()
  const cityFilter = String(city || '').trim().toLowerCase()

  return leads.filter((lead) => {
    if (statusFilter && lead.status !== statusFilter) return false
    if (sourceFilter && lead.source !== sourceFilter) return false
    if (serviceFilter && !(lead.service || '').toLowerCase().includes(serviceFilter)) return false
    if (cityFilter && !(lead.city || '').toLowerCase().includes(cityFilter)) return false
    if (query) {
      const hay = [lead.name, lead.phone, lead.email, lead.service, lead.city, lead.message]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  })
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

/**
 * Admin update: status and/or append note.
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

  if (!changed) return existing

  existing.updatedAt = at
  await writeLead(redis, existing)
  return existing
}

/** Inbox row shape — full PII only for authenticated admin clients. */
export function toLeadListItem(lead) {
  return {
    id: lead.id,
    source: lead.source,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    service: lead.service,
    city: lead.city,
    status: lead.status,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  }
}
