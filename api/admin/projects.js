import { del } from '@vercel/blob'
import { json, requireAdmin } from '../../lib/adminAuth.mjs'
import {
  createProject,
  deleteProject,
  getProject,
  isProjectsStorageConfigured,
  listProjects,
  normalizeProjectId,
  updateProject,
} from '../../lib/projectsStore.mjs'

async function deleteBlobUrls(project) {
  const urls = (project?.photos || []).map((p) => p.url).filter(Boolean)
  if (!urls.length || !process.env.BLOB_READ_WRITE_TOKEN) return { deleted: 0, errors: [] }

  const errors = []
  let deleted = 0
  for (const url of urls) {
    try {
      await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN })
      deleted += 1
    } catch (err) {
      errors.push({ url, error: err?.message || 'delete failed' })
    }
  }
  return { deleted, errors }
}

/**
 * Collection + item operations on one stable path:
 * - GET /api/admin/projects?status=draft|published|all
 * - GET /api/admin/projects?id=<projectId>
 * - POST /api/admin/projects
 * - PATCH /api/admin/projects?id=<projectId>
 * - DELETE /api/admin/projects?id=<projectId>
 *
 * Query-param item routes avoid brittle dynamic /api/.../[id] matching behind the SPA rewrite.
 */
export default async function handler(req, res) {
  const auth = requireAdmin(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  if (!isProjectsStorageConfigured()) {
    return json(res, 503, {
      error: 'Projects storage not configured',
      hint: 'Connect Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)',
    })
  }

  const itemId = normalizeProjectId(req.query?.id)

  try {
    if (req.method === 'GET') {
      if (itemId) {
        console.info('[admin/projects] GET by id', { requestedId: itemId })
        const project = await getProject(itemId)
        if (!project) {
          return json(res, 404, {
            error: 'Job not found',
            requestedId: itemId,
            redisKey: `project:${itemId}`,
          })
        }
        return json(res, 200, { project })
      }

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
      console.info('[admin/projects] created', { id: project.id, redisKey: `project:${project.id}` })
      return json(res, 201, { project })
    }

    if (req.method === 'PATCH') {
      if (!itemId) return json(res, 400, { error: 'Missing job id' })
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const project = await updateProject(itemId, body)
      return json(res, 200, { project })
    }

    if (req.method === 'DELETE') {
      if (!itemId) return json(res, 400, { error: 'Missing job id' })
      const existing = await deleteProject(itemId)
      const blobResult = await deleteBlobUrls(existing)
      return json(res, 200, { ok: true, blob: blobResult })
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    return json(res, 405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('[admin/projects]', err?.message || err)
    const status = err?.status || 500
    return json(res, status, { error: err?.message || 'Projects request failed' })
  }
}
