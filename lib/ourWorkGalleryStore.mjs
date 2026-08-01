import { getAnalyticsRedis, isAnalyticsStorageConfigured } from './analyticsRedis.mjs'
import { cleanupRemovedProjectPhotos, deleteBlobUrls } from './projectBlobCleanup.mjs'
import { listProjects, isProjectsStorageConfigured } from './projectsStore.mjs'
import { OUR_WORK_IMAGE_LIBRARY } from './ourWorkImageLibrary.mjs'
import { SITE_IMAGE_REFS } from './siteImageRefs.mjs'

export const OUR_WORK_HIDDEN_KEY = 'gallery:ourwork:hidden'
/** Standalone gallery uploads (Blob URLs + metadata). Never creates Completed Jobs. */
export const OUR_WORK_UPLOADED_KEY = 'gallery:ourwork:photos'

export const OUR_WORK_GALLERY_CATEGORIES = [
  'transformations',
  'window-cleaning',
  'solar-panel-cleaning',
  'pressure-washing',
  'roof-cleaning',
  'gutter-cleaning',
  'luxury-homes',
  'pigeon-guard',
]

export const OUR_WORK_PHOTO_LABELS = ['before', 'after', 'general']
export const MAX_UPLOADED_OUR_WORK_PHOTOS = 200
export const MAX_GALLERY_UPLOAD_BATCH = 12

export function isOurWorkGalleryStorageConfigured() {
  return isAnalyticsStorageConfigured()
}

function getRedis() {
  return getAnalyticsRedis()
}

function normalizeSrc(value) {
  return String(value || '').trim()
}

/**
 * @returns {Promise<string[]>}
 */
export async function getHiddenOurWorkSrcs() {
  const redis = getRedis()
  if (!redis) return []
  const raw = await redis.get(OUR_WORK_HIDDEN_KEY)
  if (!raw) return []
  let list = raw
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(list)) return []
  return [...new Set(list.map(normalizeSrc).filter(Boolean))]
}

/**
 * @param {string[]} srcs
 */
export async function setHiddenOurWorkSrcs(srcs) {
  const redis = getRedis()
  if (!redis) throw new Error('Gallery storage not configured')
  const next = [...new Set((srcs || []).map(normalizeSrc).filter(Boolean))].sort()
  await redis.set(OUR_WORK_HIDDEN_KEY, JSON.stringify(next))
  return next
}

/**
 * Collect non–Our Work references for an image path/URL across site placements + jobs.
 * @param {string} src
 * @param {{ exceptUploadedId?: string }} [opts]
 * @returns {Promise<{ usages: string[], inOurWorkLibrary: boolean }>}
 */
export async function findOtherUsagesForSrc(src, { exceptUploadedId = '' } = {}) {
  const target = normalizeSrc(src)
  if (!target) return { usages: [], inOurWorkLibrary: false }
  const reasons = []

  for (const ref of SITE_IMAGE_REFS) {
    if (normalizeSrc(ref.src) === target) reasons.push(ref.reason)
  }

  const inOurWorkLibrary = OUR_WORK_IMAGE_LIBRARY.some((entry) => entry.src === target)

  const uploaded = await listUploadedOurWorkPhotos()
  for (const photo of uploaded) {
    if (exceptUploadedId && photo.id === exceptUploadedId) continue
    if (normalizeSrc(photo.src) === target) {
      reasons.push(`Our Work gallery upload: ${photo.id}`)
    }
  }

  if (isProjectsStorageConfigured()) {
    const projects = await listProjects('all')
    for (const project of projects) {
      for (const photo of project?.photos || []) {
        if (normalizeSrc(photo?.url) === target) {
          reasons.push(`Published/draft job: ${project.slug || project.id}`)
        }
      }
    }
  }

  return { usages: [...new Set(reasons)], inOurWorkLibrary }
}

function newUploadedId() {
  return `upl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizePairLabel(label) {
  const value = String(label || '').trim().toLowerCase()
  if (value === 'before') return 'Before'
  if (value === 'after') return 'After'
  return null
}

function normalizeUploadedPhoto(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null
  const src = normalizeSrc(raw.src || raw.url)
  if (!/^https:\/\//i.test(src)) return null

  const category = String(raw.category || raw.service || '').trim()
  if (!OUR_WORK_GALLERY_CATEGORIES.includes(category)) return null

  const photoLabel = OUR_WORK_PHOTO_LABELS.includes(raw.photoLabel || raw.label)
    ? raw.photoLabel || raw.label
    : 'general'
  const pairLabel = normalizePairLabel(photoLabel)
  const caption = String(raw.caption || '').trim().slice(0, 200)
  const alt = String(raw.alt || caption || 'Our Work gallery photo').trim().slice(0, 200)
  const city = String(raw.city || '').trim().slice(0, 80) || null

  return {
    id: String(raw.id || newUploadedId()).slice(0, 80),
    kind: 'uploaded',
    src,
    pathname: String(raw.pathname || '').trim().slice(0, 500) || null,
    categories: [category],
    category,
    city,
    photoLabel,
    pairLabel,
    pairId: pairLabel ? String(raw.pairId || raw.id || '').slice(0, 80) || null : null,
    caption,
    alt,
    contentType: String(raw.contentType || '').slice(0, 100) || null,
    size: Number.isFinite(Number(raw.size)) ? Number(raw.size) : null,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index,
  }
}

/**
 * @returns {Promise<object[]>}
 */
export async function listUploadedOurWorkPhotos() {
  const redis = getRedis()
  if (!redis) return []
  const raw = await redis.get(OUR_WORK_UPLOADED_KEY)
  if (!raw) return []
  let list = raw
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(list)) return []
  return list
    .map((item, i) => normalizeUploadedPhoto(item, i))
    .filter(Boolean)
    .slice(0, MAX_UPLOADED_OUR_WORK_PHOTOS)
}

async function setUploadedOurWorkPhotos(photos) {
  const redis = getRedis()
  if (!redis) throw new Error('Gallery storage not configured')
  const next = (photos || [])
    .map((item, i) => normalizeUploadedPhoto(item, i))
    .filter(Boolean)
    .slice(0, MAX_UPLOADED_OUR_WORK_PHOTOS)
  await redis.set(OUR_WORK_UPLOADED_KEY, JSON.stringify(next))
  return next
}

/**
 * Append standalone gallery photos (already uploaded to Blob).
 * @param {object[]} inputs
 */
export async function addUploadedOurWorkPhotos(inputs = []) {
  if (!Array.isArray(inputs) || !inputs.length) {
    const err = new Error('No photos to add')
    err.status = 400
    throw err
  }
  if (inputs.length > MAX_GALLERY_UPLOAD_BATCH) {
    const err = new Error(`Upload at most ${MAX_GALLERY_UPLOAD_BATCH} photos at a time`)
    err.status = 400
    throw err
  }

  const existing = await listUploadedOurWorkPhotos()
  if (existing.length >= MAX_UPLOADED_OUR_WORK_PHOTOS) {
    const err = new Error(`Gallery is full (max ${MAX_UPLOADED_OUR_WORK_PHOTOS} uploaded photos)`)
    err.status = 400
    throw err
  }

  const room = MAX_UPLOADED_OUR_WORK_PHOTOS - existing.length
  const batch = inputs.slice(0, room)
  const existingUrls = new Set(existing.map((p) => p.src))
  const createdAt = new Date().toISOString()
  const added = []

  for (const input of batch) {
    const normalized = normalizeUploadedPhoto(
      {
        ...input,
        id: newUploadedId(),
        createdAt,
      },
      existing.length + added.length,
    )
    if (!normalized) {
      const err = new Error('Each photo needs a valid image URL and service category')
      err.status = 400
      throw err
    }
    if (existingUrls.has(normalized.src)) continue
    existingUrls.add(normalized.src)
    added.push(normalized)
  }

  if (!added.length) {
    const err = new Error('No new photos to add (duplicates or invalid files)')
    err.status = 400
    throw err
  }

  // Newest uploads first for admin + public gallery.
  const next = [...added, ...existing].slice(0, MAX_UPLOADED_OUR_WORK_PHOTOS)
  await setUploadedOurWorkPhotos(next)
  return { added, photos: next }
}

/**
 * Hard-delete a standalone uploaded gallery photo (Redis + Blob when unused).
 */
export async function removeUploadedOurWorkPhoto({ id = '', src = '' } = {}) {
  const targetId = String(id || '').trim()
  const targetSrc = normalizeSrc(src)
  if (!targetId && !targetSrc) {
    const err = new Error('Missing photo id')
    err.status = 400
    throw err
  }

  const existing = await listUploadedOurWorkPhotos()
  const photo = existing.find((p) => (targetId && p.id === targetId) || (targetSrc && p.src === targetSrc))
  if (!photo) {
    const err = new Error('Uploaded gallery photo not found')
    err.status = 404
    throw err
  }

  const next = existing.filter((p) => p.id !== photo.id)
  await setUploadedOurWorkPhotos(next)

  const { usages } = await findOtherUsagesForSrc(photo.src, { exceptUploadedId: photo.id })
  let fileDeleted = false
  let blob = null
  if (!usages.length) {
    blob = await deleteBlobUrls([photo.src])
    fileDeleted = (blob?.deleted || 0) > 0
  }

  return {
    removed: photo,
    photos: next,
    fileDeleted,
    keptFile: !fileDeleted,
    usages,
    blob,
    message: usages.length
      ? 'Removed from Our Work. File kept because it is still used elsewhere.'
      : fileDeleted
        ? 'Removed from Our Work and deleted the uploaded file.'
        : 'Removed from Our Work.',
  }
}

/** Public-safe shape for homepage gallery merge. */
export function toPublicUploadedGalleryEntry(photo) {
  if (!photo) return null
  return {
    src: photo.src,
    categories: photo.categories || [photo.category].filter(Boolean),
    alt: photo.alt || photo.caption || 'Our Work gallery photo',
    pairLabel: photo.pairLabel || null,
    pairId: photo.pairId || null,
    caption: photo.caption || '',
    city: photo.city || null,
    uploaded: true,
  }
}

/**
 * Hide a static Our Work gallery photo. Does not delete Published Jobs.
 * Deletes Blob storage only when unused elsewhere and URL is a remote Blob URL.
 */
export async function hideStaticOurWorkPhoto(src) {
  const target = normalizeSrc(src)
  if (!target) {
    const err = new Error('Missing photo path')
    err.status = 400
    throw err
  }

  const entry = OUR_WORK_IMAGE_LIBRARY.find((item) => item.src === target)
  if (!entry) {
    const err = new Error('That photo is not a static Our Work gallery photo')
    err.status = 400
    throw err
  }

  const hidden = await getHiddenOurWorkSrcs()
  if (hidden.includes(target)) {
    return {
      hiddenSrcs: hidden,
      alreadyHidden: true,
      fileDeleted: false,
      keptFile: true,
      usages: [],
      message: 'Photo was already removed from Our Work.',
    }
  }

  const { usages } = await findOtherUsagesForSrc(target)
  const nextHidden = await setHiddenOurWorkSrcs([...hidden, target])

  let fileDeleted = false
  let blob = null
  const isRemote = /^https:\/\//i.test(target)

  if (!usages.length && isRemote) {
    blob = await cleanupRemovedProjectPhotos([target])
    fileDeleted = (blob?.deleted || 0) > 0
  }

  return {
    hiddenSrcs: nextHidden,
    alreadyHidden: false,
    fileDeleted,
    keptFile: !fileDeleted,
    usages,
    blob,
    message: usages.length
      ? 'Removed from Our Work. File kept because it is still used elsewhere on the site.'
      : fileDeleted
        ? 'Removed from Our Work and deleted unused cloud storage file.'
        : 'Removed from Our Work. Original site image file kept.',
  }
}

export function listStaticOurWorkPhotos({ hiddenSrcs = [] } = {}) {
  const hidden = new Set(hiddenSrcs)
  return OUR_WORK_IMAGE_LIBRARY.map((entry, index) => ({
    id: `static-${index}-${entry.src}`,
    kind: 'static',
    label: 'Static Gallery Photo',
    src: entry.src,
    alt: entry.alt || '',
    categories: entry.categories || [],
    pairLabel: entry.pairLabel || null,
    pairId: entry.pairId || null,
    hidden: hidden.has(entry.src),
    canDelete: !hidden.has(entry.src),
  }))
}

export function listUploadedOurWorkPhotosForAdmin(photos = []) {
  return (photos || []).map((photo) => ({
    ...photo,
    kind: 'uploaded',
    label: 'Uploaded Gallery Photo',
    canDelete: true,
    manageHref: null,
  }))
}

export async function listPublishedJobPhotos() {
  if (!isProjectsStorageConfigured()) return []
  const projects = await listProjects('published')
  const items = []
  for (const project of projects) {
    if (project?.status !== 'published') continue
    const photos = Array.isArray(project.photos) ? project.photos : []
    photos.forEach((photo, index) => {
      const url = normalizeSrc(photo?.url)
      if (!url) return
      items.push({
        id: `job-${project.id}-${index}`,
        kind: 'published-job',
        label: 'Published Job',
        src: url,
        alt: photo.alt || '',
        projectId: project.id,
        projectSlug: project.slug,
        service: project.service,
        city: project.city,
        photoLabel: photo.label || 'general',
        canDelete: false,
        manageHref: `/admin/completed-jobs/${project.id}`,
      })
    })
  }
  return items
}
