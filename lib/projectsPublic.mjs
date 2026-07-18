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

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
const PHONE_RE = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g
const STREET_RE =
  /\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Cir|Circle|Hwy|Highway)\b\.?/gi
const GPS_RE = /\b-?\d{1,3}\.\d{4,},\s*-?\d{1,3}\.\d{4,}\b/g
const HTML_TAG_RE = /<\/?[^>]+(>|$)/g

export function sanitizePublicText(value, { maxLength = 2000 } = {}) {
  let text = String(value ?? '')
  text = text.replace(HTML_TAG_RE, ' ')
  text = text.replace(EMAIL_RE, '[redacted]')
  text = text.replace(PHONE_RE, '[redacted]')
  text = text.replace(STREET_RE, '[redacted]')
  text = text.replace(GPS_RE, '[redacted]')
  text = text.replace(/\s+/g, ' ').trim()
  if (text.length > maxLength) text = `${text.slice(0, maxLength - 1).trim()}…`
  return text
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
  if (!SERVICE_SLUGS.includes(project.service) || !CITY_SLUGS.includes(project.city)) return null

  const service = project.service
  const city = project.city
  const photos = sortPhotos(Array.isArray(project.photos) ? project.photos : [])
    .map((p, index) => {
      const url = String(p?.url || '').trim()
      if (!/^https:\/\//i.test(url)) return null
      const label = PHOTO_LABELS.includes(p.label) ? p.label : 'general'
      const fallbackAlt = `${label} photo — ${service.replace(/-/g, ' ')} in ${city}`
      return {
        url,
        label,
        alt: sanitizeAlt(p.alt, fallbackAlt),
        sortOrder: Number.isFinite(Number(p.sortOrder)) ? Number(p.sortOrder) : index,
      }
    })
    .filter(Boolean)

  if (!photos.length) return null

  const notes = includeNotes ? sanitizePublicText(project.notes, { maxLength: 2000 }) : ''
  const completedAt = String(project.completedAt || '').slice(0, 10)
  const publishedAt = project.publishedAt ? String(project.publishedAt) : null
  const updatedAt = project.updatedAt ? String(project.updatedAt) : null
  const slug = String(project.slug || '').trim()
  if (!slug) return null

  const propertyType = project.propertyType === 'commercial' ? 'commercial' : 'residential'

  return {
    slug,
    service,
    city,
    propertyType,
    completedAt,
    notes,
    photos,
    publishedAt,
    updatedAt,
  }
}

/** Card-sized payload (short description). */
export function toPublicProjectCard(project) {
  const full = toPublicProject(project, { includeNotes: true })
  if (!full) return null
  const short = sanitizePublicText(full.notes, { maxLength: 160 })
  return {
    slug: full.slug,
    service: full.service,
    city: full.city,
    propertyType: full.propertyType,
    completedAt: full.completedAt,
    description: short,
    coverImage: full.photos[0] || null,
    photoCount: full.photos.length,
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
  const service = opts.service ? String(opts.service).trim() : ''
  const city = opts.city ? String(opts.city).trim() : ''
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 100)

  if (service && !SERVICE_SLUGS.includes(service)) return []
  if (city && !CITY_SLUGS.includes(city)) return []

  const published = await listProjects('published')
  let projects = published
    .map((p) => toPublicProjectCard(p))
    .filter(Boolean)

  if (service) projects = projects.filter((p) => p.service === service)
  if (city) projects = projects.filter((p) => p.city === city)

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
