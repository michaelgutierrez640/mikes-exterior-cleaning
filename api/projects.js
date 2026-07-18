import { json } from '../lib/adminAuth.mjs'
import {
  getPublicProjectBySlug,
  isPublicProjectsConfigured,
  listPublicProjects,
} from '../lib/projectsPublic.mjs'

/**
 * Public read-only projects API (published jobs only).
 * - GET /api/projects?limit=&service=&city=
 * - GET /api/projects?slug=
 *
 * Never returns drafts, admin IDs, Blob paths, or Redis credentials.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return json(res, 405, { error: 'Method not allowed' })
  }

  if (!isPublicProjectsConfigured()) {
    return json(res, 503, { error: 'Projects temporarily unavailable' })
  }

  try {
    const slug = String(req.query?.slug || '').trim()
    if (slug) {
      const project = await getPublicProjectBySlug(slug)
      if (!project) return json(res, 404, { error: 'Project not found' })
      return json(res, 200, { project })
    }

    const service = String(req.query?.service || '').trim() || undefined
    const city = String(req.query?.city || '').trim() || undefined
    const limit = req.query?.limit
    const projects = await listPublicProjects({ service, city, limit })
    return json(res, 200, { projects })
  } catch (err) {
    console.error('[api/projects]', err?.message || err)
    return json(res, 500, { error: 'Failed to load projects' })
  }
}
