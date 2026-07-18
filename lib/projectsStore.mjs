import crypto from 'crypto'
import { getAnalyticsRedis, isAnalyticsStorageConfigured } from './analyticsRedis.mjs'

export const PROJECT_KEY_PREFIX = 'project:'
export const PROJECTS_ALL_KEY = 'projects:all'
export const PROJECTS_DRAFT_KEY = 'projects:draft'
export const PROJECTS_PUBLISHED_KEY = 'projects:published'

export const SERVICE_SLUGS = [
  'window-cleaning',
  'pressure-washing',
  'solar-panel-cleaning',
  'gutter-cleaning',
  'residential-window-cleaning',
]

export const CITY_SLUGS = [
  'modesto',
  'salida',
  'riverbank',
  'oakdale',
  'ripon',
  'turlock',
  'ceres',
  'manteca',
  'tracy',
  'stockton',
]

export const PROPERTY_TYPES = ['residential', 'commercial']
export const PHOTO_LABELS = ['before', 'after', 'general']
export const PROJECT_STATUSES = ['draft', 'published']

export const MAX_PHOTOS = 12
export const MAX_NOTES_LENGTH = 2000
export const MAX_ALT_LENGTH = 200

function projectKey(id) {
  return `${PROJECT_KEY_PREFIX}${id}`
}

function statusIndexKey(status) {
  return status === 'published' ? PROJECTS_PUBLISHED_KEY : PROJECTS_DRAFT_KEY
}

export function isProjectsStorageConfigured() {
  return isAnalyticsStorageConfigured()
}

export function getProjectsRedis() {
  return getAnalyticsRedis()
}

function newId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return crypto.randomBytes(16).toString('hex')
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function buildProjectSlug({ service, city, completedAt, id }) {
  const datePart = String(completedAt || '').slice(0, 10) || 'undated'
  const short = String(id || '').replace(/-/g, '').slice(0, 8)
  const base = [slugify(service), slugify(city), datePart, short].filter(Boolean).join('-')
  return base || `job-${short || Date.now()}`
}

function normalizePhoto(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null
  const url = String(raw.url || '').trim()
  if (!/^https:\/\//i.test(url)) return null
  const label = PHOTO_LABELS.includes(raw.label) ? raw.label : 'general'
  const alt = String(raw.alt || '').trim().slice(0, MAX_ALT_LENGTH)
  return {
    url,
    pathname: String(raw.pathname || '').trim().slice(0, 500) || null,
    label,
    alt,
    contentType: String(raw.contentType || '').slice(0, 100) || null,
    size: Number.isFinite(Number(raw.size)) ? Number(raw.size) : null,
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index,
  }
}

function normalizePhotos(photos) {
  if (!Array.isArray(photos)) return []
  return photos
    .map((p, i) => normalizePhoto(p, i))
    .filter(Boolean)
    .slice(0, MAX_PHOTOS)
    .map((p, i) => ({ ...p, sortOrder: i }))
}

/**
 * Validate and normalize create/update payload fields (excluding id/timestamps).
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
export function validateProjectInput(input = {}, { partial = false } = {}) {
  const data = {}

  if (!partial || input.service !== undefined) {
    const service = String(input.service || '').trim()
    if (!SERVICE_SLUGS.includes(service)) {
      return { ok: false, error: 'Select a valid service' }
    }
    data.service = service
  }

  if (!partial || input.city !== undefined) {
    const city = String(input.city || '').trim()
    if (!CITY_SLUGS.includes(city)) {
      return { ok: false, error: 'Select a valid city' }
    }
    data.city = city
  }

  if (!partial || input.propertyType !== undefined) {
    const propertyType = String(input.propertyType || '').trim()
    if (!PROPERTY_TYPES.includes(propertyType)) {
      return { ok: false, error: 'Select residential or commercial' }
    }
    data.propertyType = propertyType
  }

  if (!partial || input.completedAt !== undefined) {
    const completedAt = String(input.completedAt || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(completedAt)) {
      return { ok: false, error: 'Completion date must be YYYY-MM-DD' }
    }
    data.completedAt = completedAt
  }

  if (!partial || input.notes !== undefined) {
    const notes = String(input.notes ?? '').trim()
    if (notes.length > MAX_NOTES_LENGTH) {
      return { ok: false, error: `Notes must be ${MAX_NOTES_LENGTH} characters or fewer` }
    }
    data.notes = notes
  }

  if (!partial || input.status !== undefined) {
    const status = String(input.status || '').trim()
    if (!PROJECT_STATUSES.includes(status)) {
      return { ok: false, error: 'Status must be draft or published' }
    }
    data.status = status
  }

  if (!partial || input.photos !== undefined) {
    if (!Array.isArray(input.photos)) {
      return { ok: false, error: 'Photos must be an array' }
    }
    if (input.photos.length > MAX_PHOTOS) {
      return { ok: false, error: `Maximum ${MAX_PHOTOS} photos allowed` }
    }
    const photos = normalizePhotos(input.photos)
    if (input.photos.length > 0 && photos.length === 0) {
      return { ok: false, error: 'Photo URLs must be valid https URLs' }
    }
    if (data.status === 'published' || (!partial && input.status === 'published') || input.status === 'published') {
      if (photos.length === 0 && !partial) {
        return { ok: false, error: 'Add at least one photo before publishing' }
      }
    }
    data.photos = photos
  }

  if (!partial) {
    for (const key of ['service', 'city', 'propertyType', 'completedAt', 'status']) {
      if (data[key] === undefined) {
        return { ok: false, error: 'Missing required job fields' }
      }
    }
    if (data.status === 'published' && (!data.photos || data.photos.length === 0)) {
      return { ok: false, error: 'Add at least one photo before publishing' }
    }
    if (data.notes === undefined) data.notes = ''
    if (data.photos === undefined) data.photos = []
  }

  if (partial && data.status === 'published' && data.photos !== undefined && data.photos.length === 0) {
    return { ok: false, error: 'Add at least one photo before publishing' }
  }

  return { ok: true, data }
}

async function readProject(redis, id) {
  const raw = await redis.get(projectKey(id))
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return raw
}

async function writeProject(redis, project) {
  await redis.set(projectKey(project.id), JSON.stringify(project))
}

/**
 * @param {'all'|'draft'|'published'} [status]
 */
export async function listProjects(status = 'all') {
  const redis = getProjectsRedis()
  if (!redis) throw new Error('Redis not configured')

  let ids
  if (status === 'draft') ids = await redis.smembers(PROJECTS_DRAFT_KEY)
  else if (status === 'published') ids = await redis.smembers(PROJECTS_PUBLISHED_KEY)
  else ids = await redis.smembers(PROJECTS_ALL_KEY)

  if (!Array.isArray(ids) || ids.length === 0) return []

  const projects = []
  for (const id of ids) {
    const project = await readProject(redis, id)
    if (project) projects.push(project)
  }

  projects.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  return projects
}

export async function getProject(id) {
  const redis = getProjectsRedis()
  if (!redis) throw new Error('Redis not configured')
  return readProject(redis, String(id))
}

export async function createProject(input) {
  const redis = getProjectsRedis()
  if (!redis) throw new Error('Redis not configured')

  const validated = validateProjectInput(input, { partial: false })
  if (!validated.ok) {
    const err = new Error(validated.error)
    err.status = 400
    throw err
  }

  const id = newId()
  const now = new Date().toISOString()
  const { data } = validated
  const project = {
    id,
    slug: buildProjectSlug({ ...data, id }),
    ...data,
    createdAt: now,
    updatedAt: now,
    publishedAt: data.status === 'published' ? now : null,
  }

  await writeProject(redis, project)
  await redis.sadd(PROJECTS_ALL_KEY, id)
  await redis.sadd(statusIndexKey(project.status), id)

  return project
}

export async function updateProject(id, input) {
  const redis = getProjectsRedis()
  if (!redis) throw new Error('Redis not configured')

  const existing = await readProject(redis, id)
  if (!existing) {
    const err = new Error('Job not found')
    err.status = 404
    throw err
  }

  const validated = validateProjectInput(input, { partial: true })
  if (!validated.ok) {
    const err = new Error(validated.error)
    err.status = 400
    throw err
  }

  const next = {
    ...existing,
    ...validated.data,
    updatedAt: new Date().toISOString(),
  }

  // Re-validate publish requirements against merged record
  if (next.status === 'published' && (!next.photos || next.photos.length === 0)) {
    const err = new Error('Add at least one photo before publishing')
    err.status = 400
    throw err
  }

  next.slug = buildProjectSlug(next)

  if (existing.status !== next.status) {
    await redis.srem(statusIndexKey(existing.status), id)
    await redis.sadd(statusIndexKey(next.status), id)
  }

  if (next.status === 'published' && !next.publishedAt) {
    next.publishedAt = next.updatedAt
  }
  if (next.status === 'draft') {
    next.publishedAt = null
  }

  await writeProject(redis, next)
  return next
}

export async function deleteProject(id) {
  const redis = getProjectsRedis()
  if (!redis) throw new Error('Redis not configured')

  const existing = await readProject(redis, id)
  if (!existing) {
    const err = new Error('Job not found')
    err.status = 404
    throw err
  }

  await redis.del(projectKey(id))
  await redis.srem(PROJECTS_ALL_KEY, id)
  await redis.srem(PROJECTS_DRAFT_KEY, id)
  await redis.srem(PROJECTS_PUBLISHED_KEY, id)

  return existing
}
