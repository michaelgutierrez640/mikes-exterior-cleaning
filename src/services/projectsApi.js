/**
 * Public projects API client (read-only).
 * Prefers static build snapshot (SSO-safe), falls back to live API.
 */

import { citiesMatch, normalizeCitySlug, normalizeServiceSlug, servicesMatch } from '../utils/projectMatch'

async function parseJson(res) {
  const ctype = res.headers.get('content-type') || ''
  if (!ctype.includes('application/json')) {
    // SSO / HTML error pages must not be treated as empty project lists
    const err = new Error('Projects response was not JSON')
    err.nonJson = true
    err.status = res.status
    throw err
  }
  return res.json().catch(() => ({}))
}

function filterProjects(projects, { service, city, limit } = {}) {
  const serviceSlug = service ? normalizeServiceSlug(service) : ''
  const citySlug = city ? normalizeCitySlug(city) : ''
  let list = Array.isArray(projects) ? [...projects] : []
  if (serviceSlug) list = list.filter((p) => servicesMatch(p.service, serviceSlug))
  if (citySlug) list = list.filter((p) => citiesMatch(p.city, citySlug))
  list.sort((a, b) => {
    const aKey = String(a.publishedAt || a.completedAt || '')
    const bKey = String(b.publishedAt || b.completedAt || '')
    return bKey.localeCompare(aKey)
  })
  const max = Math.min(Math.max(Number(limit) || 50, 1), 100)
  return list.slice(0, max)
}

async function fetchStaticPublishedProjects() {
  const res = await fetch('/data/published-projects.json', {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
  if (!res.ok) {
    const err = new Error('Static published projects unavailable')
    err.status = res.status
    throw err
  }
  const data = await parseJson(res)
  return Array.isArray(data.projects) ? data.projects : []
}

async function fetchLivePublishedProjects({ service, city, limit } = {}) {
  const params = new URLSearchParams()
  if (service) params.set('service', service)
  if (city) params.set('city', city)
  if (limit) params.set('limit', String(limit))
  const qs = params.toString()
  const res = await fetch(`/api/projects${qs ? `?${qs}` : ''}`, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data.error || 'Failed to load projects')
  return Array.isArray(data.projects) ? data.projects : []
}

export async function fetchPublicProjects({ service, city, limit } = {}) {
  // Static snapshot first — same-origin file, reliable when API is blocked/redirected
  try {
    const all = await fetchStaticPublishedProjects()
    return filterProjects(all, { service, city, limit })
  } catch {
    // Live Redis API fallback
    return fetchLivePublishedProjects({ service, city, limit })
  }
}

export async function fetchPublicProject(slug) {
  const normalized = String(slug || '').trim()
  if (!normalized) return null

  try {
    const all = await fetchStaticPublishedProjects()
    const hit = all.find((p) => p.slug === normalized)
    if (hit) {
      // Static file is card-shaped; detail page needs full payload from API when possible
    }
  } catch {
    // ignore
  }

  const res = await fetch(`/api/projects?slug=${encodeURIComponent(normalized)}`, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
  try {
    const data = await parseJson(res)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(data.error || 'Failed to load project')
    return data.project || null
  } catch (err) {
    if (err.nonJson) {
      // Last resort: card from static snapshot (limited fields)
      try {
        const all = await fetchStaticPublishedProjects()
        const card = all.find((p) => p.slug === normalized)
        if (!card) return null
        return {
          ...card,
          notes: card.description || '',
          photos: card.coverImage ? [card.coverImage] : [],
        }
      } catch {
        throw err
      }
    }
    throw err
  }
}
