import {
  getPublicProjectBySlug,
  isPublicProjectsConfigured,
  listPublicProjects,
} from '../lib/projectsPublic.mjs'

function jsonPublic(res, status, payload, { cacheable = false } = {}) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader(
    'Cache-Control',
    cacheable ? 'public, s-maxage=60, stale-while-revalidate=300' : 'no-store',
  )
  res.status(status).json(payload)
}

/**
 * Public read-only projects API (published jobs only).
 * - GET /api/projects?limit=&service=&city=
 * - GET /api/projects?slug=
 *
 * Never returns drafts, admin IDs, Blob paths, or Redis credentials.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return jsonPublic(res, 405, { error: 'Method not allowed' })
  }

  if (!isPublicProjectsConfigured()) {
    return jsonPublic(res, 503, { error: 'Projects temporarily unavailable' })
  }

  try {
    const slug = String(req.query?.slug || '').trim()
    if (slug) {
      const project = await getPublicProjectBySlug(slug)
      if (!project) return jsonPublic(res, 404, { error: 'Project not found' })
      return jsonPublic(res, 200, { project }, { cacheable: true })
    }

    const service = String(req.query?.service || '').trim() || undefined
    const city = String(req.query?.city || '').trim() || undefined
    const limit = req.query?.limit
    const projects = await listPublicProjects({ service, city, limit })
    return jsonPublic(res, 200, { projects }, { cacheable: true })
  } catch (err) {
    console.error('[api/projects]', err?.message || err)
    return jsonPublic(res, 500, { error: 'Failed to load projects' })
  }
}
