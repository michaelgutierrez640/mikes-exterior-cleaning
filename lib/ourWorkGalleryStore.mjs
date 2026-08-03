import { getAnalyticsRedis, isAnalyticsStorageConfigured } from './analyticsRedis.mjs'
import { cleanupRemovedProjectPhotos } from './projectBlobCleanup.mjs'
import { listProjects, isProjectsStorageConfigured } from './projectsStore.mjs'
import { OUR_WORK_IMAGE_LIBRARY } from './ourWorkImageLibrary.mjs'
import { SITE_IMAGE_REFS } from './siteImageRefs.mjs'

export const OUR_WORK_HIDDEN_KEY = 'gallery:ourwork:hidden'

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
 * @returns {Promise<{ usages: string[], inOurWorkLibrary: boolean }>}
 */
export async function findOtherUsagesForSrc(src) {
  const target = normalizeSrc(src)
  if (!target) return { usages: [], inOurWorkLibrary: false }
  const reasons = []

  for (const ref of SITE_IMAGE_REFS) {
    if (normalizeSrc(ref.src) === target) reasons.push(ref.reason)
  }

  const inOurWorkLibrary = OUR_WORK_IMAGE_LIBRARY.some((entry) => entry.src === target)

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

/** Map Completed Job service slugs onto Our Work gallery filter tabs. */
const SERVICE_TO_GALLERY_CATEGORY = {
  'window-cleaning': 'window-cleaning',
  'residential-window-cleaning': 'window-cleaning',
  'pressure-washing': 'pressure-washing',
  'solar-panel-cleaning': 'solar-panel-cleaning',
  'gutter-cleaning': 'gutter-cleaning',
  'roof-cleaning': 'roof-cleaning',
  'pigeon-guard': 'pigeon-guard',
}

/** Prefer publish time, then creation, then completion day — newest Our Work first. */
function projectPublishTimestamp(project) {
  const candidates = [project?.publishedAt, project?.createdAt, project?.completedAt]
  for (const value of candidates) {
    if (!value) continue
    const ms = Date.parse(value)
    if (Number.isFinite(ms)) return { ms, iso: new Date(ms).toISOString() }
  }
  return { ms: 0, iso: null }
}

/**
 * Public-safe published-job photos for the homepage Our Work gallery.
 * Newest published jobs first; photos within a job keep original sortOrder.
 * Dedupes by image URL. Never includes drafts, admin IDs, or blob pathnames.
 */
export async function listPublicOurWorkJobPhotos() {
  if (!isProjectsStorageConfigured()) return []

  const projects = (await listProjects('published'))
    .filter((project) => project?.status === 'published')
    .map((project) => ({ project, ...projectPublishTimestamp(project) }))
    .sort((a, b) => {
      if (b.ms !== a.ms) return b.ms - a.ms
      return String(a.project.slug || '').localeCompare(String(b.project.slug || ''))
    })

  const byUrl = new Map()
  const ordered = []

  for (const { project, iso: publishedAt } of projects) {
    const projectSlug = String(project.slug || '').trim()
    if (!projectSlug) continue

    const photos = [...(Array.isArray(project.photos) ? project.photos : [])]
      .map((photo, index) => ({ photo, index }))
      .filter(({ photo }) => normalizeSrc(photo?.url))
      .sort(
        (a, b) =>
          (Number.isFinite(Number(a.photo.sortOrder)) ? Number(a.photo.sortOrder) : a.index) -
          (Number.isFinite(Number(b.photo.sortOrder)) ? Number(b.photo.sortOrder) : b.index),
      )

    for (const { photo, index } of photos) {
      const src = normalizeSrc(photo.url)
      if (!src || !/^https:\/\//i.test(src) || byUrl.has(src)) continue

      const category = SERVICE_TO_GALLERY_CATEGORY[project.service] || 'window-cleaning'
      const photoLabel = String(photo.label || 'general').toLowerCase()
      const kind = String(photo.kind || '').toLowerCase()
      const contentType = String(photo.contentType || '').toLowerCase()
      const isVideo =
        kind === 'video' ||
        contentType.startsWith('video/') ||
        /\.(mp4|mov|webm|m4v)(\?|$)/i.test(src)
      const pairLabel =
        isVideo ? null : photoLabel === 'before' ? 'Before' : photoLabel === 'after' ? 'After' : null
      const sortOrder = Number.isFinite(Number(photo.sortOrder)) ? Number(photo.sortOrder) : index
      const posterUrl = normalizeSrc(photo.posterUrl)

      const entry = {
        src,
        alt:
          photo.alt ||
          `${project.service || 'Exterior cleaning'} in ${project.city || 'the Central Valley'}`,
        categories: [category],
        pairLabel,
        pairId: pairLabel ? `job-${projectSlug}` : null,
        projectSlug,
        city: project.city || null,
        service: project.service || null,
        publishedAt,
        sortOrder,
        fromPublishedJob: true,
        type: isVideo ? 'video' : 'image',
        poster: isVideo && posterUrl ? posterUrl : undefined,
        contentType: photo.contentType || undefined,
      }
      byUrl.set(src, entry)
      ordered.push(entry)
    }
  }

  return ordered
}
