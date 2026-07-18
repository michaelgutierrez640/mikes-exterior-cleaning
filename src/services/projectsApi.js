/**
 * Public projects API client (read-only).
 */

async function parseJson(res) {
  return res.json().catch(() => ({}))
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
