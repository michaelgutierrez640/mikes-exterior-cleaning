import crypto from 'crypto'
import { getAnalyticsRedis, isAnalyticsStorageConfigured } from './analyticsRedis.mjs'
import { inferMediaKind, MAX_MEDIA_ITEMS } from './projectMedia.mjs'

export const PROJECT_KEY_PREFIX = 'project:'
export const PROJECTS_ALL_KEY = 'projects:all'
export const PROJECTS_DRAFT_KEY = 'projects:draft'
export const PROJECTS_PUBLISHED_KEY = 'projects:published'
/** Redis hash: slug → project id (for uniqueness + fast public lookup). */
export const PROJECTS_SLUG_INDEX_KEY = 'projects:slugs'

export const SERVICE_SLUGS = [
  'window-cleaning',
  'pressure-washing',
  'solar-panel-cleaning',
  'gutter-cleaning',
  'residential-window-cleaning',
  'pigeon-guard',
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
  'patterson',
]

export const PROPERTY_TYPES = ['residential', 'commercial']
export const PHOTO_LABELS = ['before', 'after', 'general']
export const PROJECT_STATUSES = ['draft', 'published']
export const FACEBOOK_POST_STATUSES = ['not_posted', 'pending', 'posted', 'failed']

/** @deprecated use MAX_MEDIA_ITEMS — kept for existing imports */
export const MAX_PHOTOS = MAX_MEDIA_ITEMS
export { MAX_MEDIA_ITEMS }
export const MAX_NOTES_LENGTH = 2000
export const MAX_ALT_LENGTH = 200
export const MAX_FACEBOOK_CAPTION_LENGTH = 2000
export const MAX_FACEBOOK_ERROR_LENGTH = 400

function defaultFacebookFields() {
  return {
    facebookPostStatus: 'not_posted',
    facebookPostId: null,
    facebookPostedAt: null,
    facebookPostError: null,
    facebookCaption: null,
  }
}

function normalizeFacebookStatus(value) {
  const status = String(value || '').trim()
  return FACEBOOK_POST_STATUSES.includes(status) ? status : 'not_posted'
}

function projectKey(id) {
  return `${PROJECT_KEY_PREFIX}${id}`
}

/** Normalize Redis set members / URL ids to a plain project id string. */
export function normalizeProjectId(value) {
  let id = String(value ?? '').trim()
  if (!id) return ''
  if (
    (id.startsWith('"') && id.endsWith('"')) ||
    (id.startsWith("'") && id.endsWith("'"))
  ) {
    id = id.slice(1, -1).trim()
  }
  if (id.startsWith(PROJECT_KEY_PREFIX)) {
    id = id.slice(PROJECT_KEY_PREFIX.length)
  }
  return id
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

/**
 * Ensure slug is unique across all projects (Redis hash + scan fallback).
 * Appends extra id characters when needed.
 */
export async function ensureUniqueSlug(redis, desiredSlug, excludeId = null) {
  let candidate = slugify(desiredSlug) || `job-${Date.now()}`
  const exclude = normalizeProjectId(excludeId)
  const idTail = exclude.replace(/-/g, '')

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const ownerId = await redis.hget(PROJECTS_SLUG_INDEX_KEY, candidate)
    if (!ownerId || normalizeProjectId(ownerId) === exclude) {
      // Also scan records in case index is incomplete (legacy jobs)
      const conflict = await findProjectIdBySlugScan(redis, candidate, exclude)
      if (!conflict) return candidate
    }
    const extra = idTail.slice(8, 8 + 4 + attempt) || String(attempt + 1)
    candidate = `${slugify(desiredSlug)}-${extra}`.replace(/-+/g, '-').slice(0, 80)
  }

  return `${candidate}-${Date.now().toString(36)}`.slice(0, 80)
}

async function findProjectIdBySlugScan(redis, slug, excludeId) {
  const ids = await redis.smembers(PROJECTS_ALL_KEY)
  for (const rawId of ids || []) {
    const id = normalizeProjectId(rawId)
    if (!id || id === excludeId) continue
    const project = await readProject(redis, id)
    if (project?.slug === slug) return id
  }
  return null
}

async function syncSlugIndex(redis, slug, id, previousSlug = null) {
  if (previousSlug && previousSlug !== slug) {
    const owner = await redis.hget(PROJECTS_SLUG_INDEX_KEY, previousSlug)
    if (!owner || normalizeProjectId(owner) === normalizeProjectId(id)) {
      await redis.hdel(PROJECTS_SLUG_INDEX_KEY, previousSlug)
    }
  }
  if (slug && id) {
    await redis.hset(PROJECTS_SLUG_INDEX_KEY, { [slug]: id })
  }
}

function normalizePhoto(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null
  const url = String(raw.url || '').trim()
  if (!/^https:\/\//i.test(url)) return null
  const label = PHOTO_LABELS.includes(raw.label) ? raw.label : 'general'
  const alt = String(raw.alt || '').trim().slice(0, MAX_ALT_LENGTH)
  const contentType = String(raw.contentType || '').slice(0, 100) || null
  const kind = inferMediaKind({ ...raw, contentType, url, pathname: raw.pathname })
  const posterUrl = String(raw.posterUrl || '').trim()
  const safePoster = posterUrl && /^https:\/\//i.test(posterUrl) ? posterUrl : null
  const durationSeconds = Number(raw.durationSeconds)
  return {
    url,
    pathname: String(raw.pathname || '').trim().slice(0, 500) || null,
    label,
    alt,
    contentType,
    size: Number.isFinite(Number(raw.size)) ? Number(raw.size) : null,
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index,
    kind,
    posterUrl: kind === 'video' ? safePoster : null,
    durationSeconds:
      kind === 'video' && Number.isFinite(durationSeconds) && durationSeconds > 0
        ? Math.min(Math.round(durationSeconds), 600)
        : null,
  }
}

function normalizePhotos(photos) {
  if (!Array.isArray(photos)) return []
  return photos
    .map((p, i) => normalizePhoto(p, i))
    .filter(Boolean)
    .slice(0, MAX_MEDIA_ITEMS)
    .map((p, i) => ({ ...p, sortOrder: i }))
}

function hasPublishableMedia(photos = []) {
  return (Array.isArray(photos) ? photos : []).some((item) => item?.url)
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
      return { ok: false, error: 'Media must be an array' }
    }
    if (input.photos.length > MAX_MEDIA_ITEMS) {
      return { ok: false, error: `Maximum ${MAX_MEDIA_ITEMS} photos and videos allowed` }
    }
    const photos = normalizePhotos(input.photos)
    if (input.photos.length > 0 && photos.length === 0) {
      return { ok: false, error: 'Media URLs must be valid https URLs' }
    }
    // First-time create/publish requires at least one photo or video.
    // Edits may clear media (published projects keep a public placeholder).
    if (
      !partial &&
      (data.status === 'published' || input.status === 'published') &&
      !hasPublishableMedia(photos)
    ) {
      return { ok: false, error: 'Add at least one photo or video before publishing' }
    }
    data.photos = photos
  }

  if (!partial) {
    for (const key of ['service', 'city', 'propertyType', 'completedAt', 'status']) {
      if (data[key] === undefined) {
        return { ok: false, error: 'Missing required job fields' }
      }
    }
    if (data.status === 'published' && !hasPublishableMedia(data.photos)) {
      return { ok: false, error: 'Add at least one photo or video before publishing' }
    }
    if (data.notes === undefined) data.notes = ''
    if (data.photos === undefined) data.photos = []
  }

  return { ok: true, data }
}

async function readProject(redis, id) {
  const normalized = normalizeProjectId(id)
  if (!normalized) return null
  const raw = await redis.get(projectKey(normalized))
  if (!raw) return null
  let project = raw
  if (typeof raw === 'string') {
    try {
      project = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!project || typeof project !== 'object') return null
  // Always expose the canonical id used for the Redis key
  return {
    ...defaultFacebookFields(),
    ...project,
    id: normalizeProjectId(project.id) || normalized,
    facebookPostStatus: normalizeFacebookStatus(project.facebookPostStatus),
    facebookPostId: project.facebookPostId ? String(project.facebookPostId).trim() : null,
    facebookPostedAt: project.facebookPostedAt ? String(project.facebookPostedAt) : null,
    facebookPostError: project.facebookPostError
      ? String(project.facebookPostError).trim().slice(0, MAX_FACEBOOK_ERROR_LENGTH)
      : null,
    facebookCaption: project.facebookCaption
      ? String(project.facebookCaption).trim().slice(0, MAX_FACEBOOK_CAPTION_LENGTH)
      : null,
  }
}

async function writeProject(redis, project) {
  const id = normalizeProjectId(project.id)
  const record = { ...project, id }
  await redis.set(projectKey(id), JSON.stringify(record))
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
  for (const rawId of ids) {
    const id = normalizeProjectId(rawId)
    const project = await readProject(redis, id)
    if (project) projects.push(project)
  }

  projects.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  return projects
}

/**
 * Lookup by project id (preferred) or slug (backwards-compatible).
 * Logs only id/key/exists — never secrets or full records.
 */
export async function getProject(idOrSlug) {
  const redis = getProjectsRedis()
  if (!redis) throw new Error('Redis not configured')

  const requested = normalizeProjectId(idOrSlug)
  const redisKey = projectKey(requested)

  let exists = 0
  try {
    exists = await redis.exists(redisKey)
  } catch {
    exists = 0
  }

  console.info('[projects] lookup', {
    requestedId: requested,
    redisKey,
    keyExists: Boolean(exists),
  })

  let project = requested ? await readProject(redis, requested) : null

  // Slug index fast path (public URLs use slug, not UUID)
  if (!project && requested) {
    try {
      const indexedId = await redis.hget(PROJECTS_SLUG_INDEX_KEY, requested)
      if (indexedId) {
        project = await readProject(redis, indexedId)
        if (project) {
          console.info('[projects] lookup slug-index hit', {
            requestedId: requested,
            matchedId: project.id,
          })
        }
      }
    } catch {
      // ignore index errors; fall through to scan
    }
  }

  // Backwards-compatible: find by slug or raw member id if direct key miss
  if (!project && requested) {
    const allIds = await redis.smembers(PROJECTS_ALL_KEY)
    for (const rawId of allIds || []) {
      const candidateId = normalizeProjectId(rawId)
      const candidate = await readProject(redis, candidateId)
      if (!candidate) continue
      if (
        candidateId === requested ||
        candidate.id === requested ||
        candidate.slug === requested ||
        candidate.slug === idOrSlug
      ) {
        project = candidate
        if (candidate.slug) {
          await syncSlugIndex(redis, candidate.slug, candidate.id)
        }
        console.info('[projects] lookup fallback hit', {
          requestedId: requested,
          matchedId: candidate.id,
          matchedBy: candidateId === requested || candidate.id === requested ? 'id' : 'slug',
        })
        break
      }
    }
  }

  console.info('[projects] lookup result', {
    requestedId: requested,
    redisKey,
    found: Boolean(project),
    foundId: project?.id || null,
  })

  return project
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
  const baseSlug = buildProjectSlug({ ...data, id })
  const slug = await ensureUniqueSlug(redis, baseSlug, id)
  const publishing = data.status === 'published'
  const project = {
    id,
    slug,
    slugLocked: publishing,
    ...data,
    ...defaultFacebookFields(),
    createdAt: now,
    updatedAt: now,
    publishedAt: publishing ? now : null,
  }

  await writeProject(redis, project)
  await redis.sadd(PROJECTS_ALL_KEY, id)
  await redis.sadd(statusIndexKey(project.status), id)
  await syncSlugIndex(redis, slug, id)

  console.info('[projects] created', {
    id,
    redisKey: projectKey(id),
    status: project.status,
    slug,
    slugLocked: project.slugLocked,
  })

  return project
}

export async function updateProject(id, input) {
  const redis = getProjectsRedis()
  if (!redis) throw new Error('Redis not configured')

  const normalizedId = normalizeProjectId(id)
  const existing = (await getProject(normalizedId)) || (await readProject(redis, normalizedId))
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
    id: existing.id,
    updatedAt: new Date().toISOString(),
  }

  // First publish (draft → published) requires at least one photo or video.
  // Clearing media on an already-published job is allowed (public placeholder).
  const firstPublishing = existing.status !== 'published' && next.status === 'published'
  if (firstPublishing && !hasPublishableMedia(next.photos)) {
    const err = new Error('Add at least one photo or video before publishing')
    err.status = 400
    throw err
  }

  const slugFrozen =
    Boolean(existing.slugLocked) ||
    Boolean(existing.publishedAt) ||
    existing.status === 'published'

  const previousSlug = existing.slug
  if (slugFrozen) {
    // Freeze public URL after first publish — edits must not change slug
    next.slug = existing.slug
    next.slugLocked = true
  } else {
    const baseSlug = buildProjectSlug(next)
    next.slug = await ensureUniqueSlug(redis, baseSlug, existing.id)
    next.slugLocked = false
  }

  const indexId = existing.id
  if (existing.status !== next.status) {
    await redis.srem(statusIndexKey(existing.status), indexId)
    await redis.sadd(statusIndexKey(next.status), indexId)
  }

  if (next.status === 'published' && !next.publishedAt) {
    next.publishedAt = next.updatedAt
  }
  if (next.status === 'published') {
    next.slugLocked = true
  }
  if (next.status === 'draft' && !slugFrozen) {
    next.publishedAt = null
  }
  // Unpublish keeps slug frozen so republish restores the same URL
  if (next.status === 'draft' && slugFrozen) {
    next.publishedAt = null
    next.slugLocked = true
    next.slug = existing.slug
  }

  // Preserve Facebook posting metadata across content edits — never wipe on normal updates.
  next.facebookPostStatus = normalizeFacebookStatus(
    existing.facebookPostStatus ?? next.facebookPostStatus,
  )
  next.facebookPostId = existing.facebookPostId || null
  next.facebookPostedAt = existing.facebookPostedAt || null
  next.facebookPostError = existing.facebookPostError || null
  next.facebookCaption = existing.facebookCaption || null

  await writeProject(redis, next)
  await syncSlugIndex(redis, next.slug, next.id, previousSlug)
  return next
}

/**
 * Patch Facebook posting fields only (used after Graph API attempts).
 * Does not change public content, slug, or publish status.
 */
export async function updateProjectFacebookState(id, patch = {}) {
  const redis = getProjectsRedis()
  if (!redis) throw new Error('Redis not configured')

  const normalizedId = normalizeProjectId(id)
  const existing = (await getProject(normalizedId)) || (await readProject(redis, normalizedId))
  if (!existing) {
    const err = new Error('Job not found')
    err.status = 404
    throw err
  }

  const next = {
    ...existing,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  }

  if (patch.facebookPostStatus !== undefined) {
    next.facebookPostStatus = normalizeFacebookStatus(patch.facebookPostStatus)
  }
  if (patch.facebookPostId !== undefined) {
    const postId = String(patch.facebookPostId || '').trim()
    next.facebookPostId = postId || null
  }
  if (patch.facebookPostedAt !== undefined) {
    next.facebookPostedAt = patch.facebookPostedAt ? String(patch.facebookPostedAt) : null
  }
  if (patch.facebookPostError !== undefined) {
    const message = String(patch.facebookPostError || '').trim()
    next.facebookPostError = message ? message.slice(0, MAX_FACEBOOK_ERROR_LENGTH) : null
  }
  if (patch.facebookCaption !== undefined) {
    const caption = String(patch.facebookCaption || '').trim()
    next.facebookCaption = caption ? caption.slice(0, MAX_FACEBOOK_CAPTION_LENGTH) : null
  }

  await writeProject(redis, next)
  return next
}

export async function deleteProject(id) {
  const redis = getProjectsRedis()
  if (!redis) throw new Error('Redis not configured')

  const existing = (await getProject(id)) || (await readProject(redis, normalizeProjectId(id)))
  if (!existing) {
    const err = new Error('Job not found')
    err.status = 404
    throw err
  }

  const indexId = existing.id
  await redis.del(projectKey(indexId))
  await redis.srem(PROJECTS_ALL_KEY, indexId)
  await redis.srem(PROJECTS_DRAFT_KEY, indexId)
  await redis.srem(PROJECTS_PUBLISHED_KEY, indexId)
  if (existing.slug) {
    const owner = await redis.hget(PROJECTS_SLUG_INDEX_KEY, existing.slug)
    if (!owner || normalizeProjectId(owner) === indexId) {
      await redis.hdel(PROJECTS_SLUG_INDEX_KEY, existing.slug)
    }
  }

  return existing
}
