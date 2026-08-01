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

/**
 * Public-safe published-job photos for the homepage Our Work gallery.
 * Dedupes by image URL. Never includes drafts, admin IDs, or blob pathnames.
 */
export async function listPublicOurWorkJobPhotos() {
  const adminItems = await listPublishedJobPhotos()
  const byUrl = new Map()

  for (const photo of adminItems) {
    const src = normalizeSrc(photo?.src)
    const projectSlug = String(photo?.projectSlug || '').trim()
    if (!src || !/^https:\/\//i.test(src) || !projectSlug) continue
    if (byUrl.has(src)) continue

    const category = SERVICE_TO_GALLERY_CATEGORY[photo.service] || 'window-cleaning'
    const photoLabel = String(photo.photoLabel || 'general').toLowerCase()
    const pairLabel = photoLabel === 'before' ? 'Before' : photoLabel === 'after' ? 'After' : null

    byUrl.set(src, {
      src,
      alt: photo.alt || `${photo.service || 'Exterior cleaning'} in ${photo.city || 'the Central Valley'}`,
      categories: [category],
      pairLabel,
      pairId: pairLabel ? `job-${projectSlug}` : null,
      projectSlug,
      city: photo.city || null,
      service: photo.service || null,
      fromPublishedJob: true,
    })
  }

  return [...byUrl.values()]
}
