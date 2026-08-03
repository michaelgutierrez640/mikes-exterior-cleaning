/**
 * Public-facing project helpers: sanitize + serialize published-only records.
 * Never expose admin IDs, Redis keys, Blob paths, or draft data.
 */
import {
  CITY_SLUGS,
  getProject,
  isProjectsStorageConfigured,
  listProjects,
  PHOTO_LABELS,
  SERVICE_SLUGS,
} from './projectsStore.mjs'
import { getCoverPhoto, inferMediaKind, isPhotoMedia, isVideoMedia } from './projectMedia.mjs'
import { sanitizePublicText } from './sanitizePublicText.mjs'
import { citiesMatch, normalizeCitySlug, normalizeServiceSlug, servicesMatch } from './projectMatch.mjs'
export { sanitizePublicText }

/** Professional fallback when a published project has no remaining photos. */
export const PROJECT_PHOTO_PLACEHOLDER = {
  url: 'https://www.mikesexteriorcleaning.com/images/before-after/img-0947-after.jpg',
  label: 'general',
  alt: "Completed exterior cleaning project — Mike's Exterior Cleaning Services",
  sortOrder: 0,
  isPlaceholder: true,
}

function sanitizeAlt(value, fallback) {
  const cleaned = sanitizePublicText(value, { maxLength: 200 })
  return cleaned || fallback
}

function sortPhotos(photos) {
  return [...photos].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

/**
 * Allowlist serializer for public API / UI.
 * @returns {object|null}
 */
export function toPublicProject(project, { includeNotes = true } = {}) {
  if (!project || project.status !== 'published') return null
  const service = normalizeServiceSlug(project.service)
  const city = normalizeCitySlug(project.city)
  if (!SERVICE_SLUGS.includes(service) || !CITY_SLUGS.includes(city)) return null
  const photos = sortPhotos(Array.isArray(project.photos) ? project.photos : [])
    .map((p, index) => {
      const url = String(p?.url || '').trim()
      if (!/^https:\/\//i.test(url)) return null
      const label = PHOTO_LABELS.includes(p.label) ? p.label : 'general'
      const kind = inferMediaKind(p)
      const fallbackAlt =
        kind === 'video'
          ? `Video — ${service.replace(/-/g, ' ')} in ${city}`
          : `${label} photo — ${service.replace(/-/g, ' ')} in ${city}`
      const posterUrl = String(p?.posterUrl || '').trim()
      return {
        url,
        label,
        alt: sanitizeAlt(p.alt, fallbackAlt),
        sortOrder: Number.isFinite(Number(p.sortOrder)) ? Number(p.sortOrder) : index,
        kind,
        contentType: p.contentType ? String(p.contentType).slice(0, 100) : null,
        posterUrl: kind === 'video' && /^https:\/\//i.test(posterUrl) ? posterUrl : null,
        durationSeconds:
          kind === 'video' && Number.isFinite(Number(p.durationSeconds))
            ? Number(p.durationSeconds)
            : null,
      }
    })
    .filter(Boolean)

  const notes = includeNotes ? sanitizePublicText(project.notes, { maxLength: 2000 }) : ''
  const completedAt = String(project.completedAt || '').slice(0, 10)
  const publishedAt = project.publishedAt ? String(project.publishedAt) : null
  const updatedAt = project.updatedAt ? String(project.updatedAt) : null
  const slug = String(project.slug || '').trim()
  if (!slug) return null

  const propertyType = project.propertyType === 'commercial' ? 'commercial' : 'residential'
  const publicPhotos = photos.length ? photos : [{ ...PROJECT_PHOTO_PLACEHOLDER, kind: 'photo' }]

  return {
    slug,
    service,
    city,
    propertyType,
    completedAt,
    notes,
    photos: publicPhotos,
    hasPlaceholderCover: photos.length === 0,
    publishedAt,
    updatedAt,
  }
}

/** Card-sized payload (short description). */
export function toPublicProjectCard(project) {
  const full = toPublicProject(project, { includeNotes: true })
  if (!full) return null
  const short = sanitizePublicText(full.notes, { maxLength: 160 })
  const coverPhoto = getCoverPhoto(full.photos)
  const firstVideo = full.photos.find((item) => isVideoMedia(item))
  const coverImage = coverPhoto
    ? coverPhoto
    : firstVideo
      ? {
          url: firstVideo.posterUrl || PROJECT_PHOTO_PLACEHOLDER.url,
          label: 'general',
          alt: firstVideo.alt || 'Project video',
          kind: firstVideo.posterUrl ? 'photo' : 'photo',
          isVideoCover: true,
        }
      : full.photos[0] || null
  return {
    slug: full.slug,
    service: full.service,
    city: full.city,
    propertyType: full.propertyType,
    completedAt: full.completedAt,
    description: short,
    coverImage,
    photoCount: full.hasPlaceholderCover ? 0 : full.photos.filter((p) => isPhotoMedia(p)).length,
    videoCount: full.hasPlaceholderCover ? 0 : full.photos.filter((p) => isVideoMedia(p)).length,
    mediaCount: full.hasPlaceholderCover ? 0 : full.photos.length,
    hasPlaceholderCover: Boolean(full.hasPlaceholderCover),
    publishedAt: full.publishedAt,
  }
}

export function isPublicProjectsConfigured() {
  return isProjectsStorageConfigured()
}

/**
 * @param {{ service?: string, city?: string, limit?: number }} [opts]
 */
export async function listPublicProjects(opts = {}) {
  const service = normalizeServiceSlug(opts.service)
  const city = normalizeCitySlug(opts.city)
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 100)

  if (opts.service && !service) return []
  if (opts.city && !city) return []
  if (service && !SERVICE_SLUGS.includes(service)) return []
  if (city && !CITY_SLUGS.includes(city)) return []

  const published = await listProjects('published')
  let projects = published
    .filter((p) => p?.status === 'published')
    .map((p) => toPublicProjectCard(p))
    .filter(Boolean)

  if (service) projects = projects.filter((p) => servicesMatch(p.service, service))
  if (city) projects = projects.filter((p) => citiesMatch(p.city, city))

  projects.sort((a, b) => {
    const aKey = String(a.publishedAt || a.completedAt || '')
    const bKey = String(b.publishedAt || b.completedAt || '')
    return bKey.localeCompare(aKey)
  })

  return projects.slice(0, limit)
}

export async function getPublicProjectBySlug(slug) {
  const normalized = String(slug || '')
    .trim()
    .toLowerCase()
  if (!normalized) return null

  const project = await getProject(normalized)
  return toPublicProject(project)
}

/** Build-time sitemap / prerender: published slug + lastmod only. */
export async function listPublishedProjectSitemapEntries() {
  if (!isPublicProjectsConfigured()) return []
  try {
    const published = await listProjects('published')
    return published
      .filter((p) => p?.status === 'published')
      .map((p) => toPublicProject(p, { includeNotes: false }))
      .filter(Boolean)
      .map((p) => ({
        slug: p.slug,
        lastmod: (p.updatedAt || p.publishedAt || p.completedAt || '').slice(0, 10) || undefined,
        service: p.service,
        city: p.city,
        completedAt: p.completedAt,
        propertyType: p.propertyType,
        coverImage: p.photos?.[0]?.url || null,
        notes: '',
      }))
      .sort((a, b) => String(b.lastmod || '').localeCompare(String(a.lastmod || '')))
  } catch (err) {
    console.warn('[projectsPublic] sitemap fetch skipped:', err?.message || err)
    return []
  }
}
