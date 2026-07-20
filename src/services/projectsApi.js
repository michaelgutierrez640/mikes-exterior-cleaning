/**
 * Public projects API client (read-only).
 */
import { cityLabel, serviceLabel } from '../utils/projectLabels'
import { getProjectImageSources } from '../utils/projectImageSrc'

async function parseJson(res) {
  return res.json().catch(() => ({}))
}

/** Related service slugs that may share Completed Jobs before/after pairs. */
const SERVICE_PAIR_ALIASES = {
  'window-cleaning': ['window-cleaning', 'residential-window-cleaning'],
  'residential-window-cleaning': ['residential-window-cleaning', 'window-cleaning'],
}

export async function fetchPublicProjects({ service, city, limit } = {}) {
  const params = new URLSearchParams()
  if (service) params.set('service', service)
  if (city) params.set('city', city)
  if (limit) params.set('limit', String(limit))
  const qs = params.toString()
  const res = await fetch(`/api/projects${qs ? `?${qs}` : ''}`, {
    headers: { Accept: 'application/json' },
  })
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data.error || 'Failed to load projects')
  return Array.isArray(data.projects) ? data.projects : []
}

export async function fetchPublicProject(slug) {
  const res = await fetch(`/api/projects?slug=${encodeURIComponent(slug)}`, {
    headers: { Accept: 'application/json' },
  })
  const data = await parseJson(res)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(data.error || 'Failed to load project')
  return data.project || null
}

/**
 * Published Completed Jobs with both Before and After photo labels.
 * Only returns real public HTTPS image URLs from published projects.
 */
export async function fetchPublishedBeforeAfterPairs(serviceSlug, { limit = 12 } = {}) {
  const services = SERVICE_PAIR_ALIASES[serviceSlug] || [serviceSlug]
  const cardsBySlug = new Map()

  for (const service of services) {
    try {
      const cards = await fetchPublicProjects({ service, limit })
      for (const card of cards) {
        if (card?.slug && !cardsBySlug.has(card.slug)) cardsBySlug.set(card.slug, card)
      }
    } catch {
      // API may be unavailable on local static builds — fail closed (no invented pairs).
    }
  }

  const pairs = []
  for (const card of cardsBySlug.values()) {
    if ((card.photoCount ?? 0) < 2) continue
    let project
    try {
      project = await fetchPublicProject(card.slug)
    } catch {
      continue
    }
    if (!project?.photos?.length) continue

    const before = project.photos.find((p) => p.label === 'before' && /^https:\/\//i.test(p.url))
    const after = project.photos.find((p) => p.label === 'after' && /^https:\/\//i.test(p.url))
    if (!before || !after) continue

    pairs.push({
      id: `job-${project.slug}`,
      label: `${serviceLabel(project.service)} — ${cityLabel(project.city)}`,
      before: getProjectImageSources(before, 'gallery')?.src || before.url,
      after: getProjectImageSources(after, 'gallery')?.src || after.url,
      aspectClass: 'aspect-[16/10]',
      source: 'completed-job',
    })

    if (pairs.length >= limit) break
  }

  return pairs
}
