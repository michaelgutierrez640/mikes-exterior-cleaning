import { json, requireAdmin } from '../../lib/adminAuth.mjs'
import {
  createProject,
  isProjectsStorageConfigured,
  listProjects,
} from '../../lib/projectsStore.mjs'

export default async function handler(req, res) {
  const auth = requireAdmin(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  if (!isProjectsStorageConfigured()) {
    return json(res, 503, {
      error: 'Projects storage not configured',
      hint: 'Connect Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)',
    })
  }

  try {
    if (req.method === 'GET') {
      const status = String(req.query?.status || 'all')
      const allowed = ['all', 'draft', 'published']
      if (!allowed.includes(status)) {
        return json(res, 400, { error: 'status must be all, draft, or published' })
      }
      const projects = await listProjects(status)
      return json(res, 200, { projects })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const project = await createProject(body)
      return json(res, 201, { project })
    }

    res.setHeader('Allow', 'GET, POST')
    return json(res, 405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('[admin/projects]', err?.message || err)
    const status = err?.status || 500
    return json(res, status, { error: err?.message || 'Projects request failed' })
  }
}
