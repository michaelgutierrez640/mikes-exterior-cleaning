import { json, requireAdmin } from '../../../lib/adminAuth.mjs'
import { cleanupRemovedProjectPhotos, deleteBlobUrls } from '../../../lib/projectBlobCleanup.mjs'
import {
  deleteProject,
  getProject,
  isProjectsStorageConfigured,
  normalizeProjectId,
  updateProject,
} from '../../../lib/projectsStore.mjs'

/**
 * Resolve id from query, path, or framework params.
 * Dynamic /api/admin/projects/[id] can fail to populate req.query behind SPA hosts.
 */
function getId(req) {
  const candidates = [
    req.query?.id,
    req.params?.id,
    req.query?.['id'],
  ]

  for (const value of candidates) {
    const normalized = normalizeProjectId(value)
    if (normalized) return normalized
  }

  const path = String(req.url || '')
  const match = path.match(/\/api\/admin\/projects\/([^/?#]+)/i)
  if (match?.[1]) {
    try {
      return normalizeProjectId(decodeURIComponent(match[1]))
    } catch {
      return normalizeProjectId(match[1])
    }
  }

  return ''
}

export default async function handler(req, res) {
  const auth = requireAdmin(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  if (!isProjectsStorageConfigured()) {
    return json(res, 503, {
      error: 'Projects storage not configured',
      hint: 'Connect Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)',
    })
  }

  const id = getId(req)
  console.info('[admin/projects/id] request', {
    method: req.method,
    requestedId: id || null,
    redisKey: id ? `project:${id}` : null,
    queryKeys: Object.keys(req.query || {}),
  })

  if (!id) return json(res, 400, { error: 'Missing job id' })

  try {
    if (req.method === 'GET') {
      const project = await getProject(id)
      if (!project) {
        return json(res, 404, {
          error: 'Job not found',
          requestedId: id,
          redisKey: `project:${id}`,
        })
      }
      return json(res, 200, { project })
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const existing = await getProject(id)
      if (!existing) {
        return json(res, 404, {
          error: 'Job not found',
          requestedId: id,
          redisKey: `project:${id}`,
        })
      }

      const project = await updateProject(id, body)

      let blob = null
      if (Array.isArray(body.photos)) {
        const before = new Set((existing.photos || []).map((p) => String(p?.url || '').trim()).filter(Boolean))
        const after = new Set((project.photos || []).map((p) => String(p?.url || '').trim()).filter(Boolean))
        const removed = [...before].filter((url) => !after.has(url))
        if (removed.length) {
          blob = await cleanupRemovedProjectPhotos(removed)
        }
      }

      return json(res, 200, { project, blob })
    }

    if (req.method === 'DELETE') {
      const existing = await deleteProject(id)
      const blobResult = await deleteBlobUrls((existing?.photos || []).map((p) => p.url).filter(Boolean))
      return json(res, 200, { ok: true, blob: blobResult })
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE')
    return json(res, 405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('[admin/projects/id]', err?.message || err)
    const status = err?.status || 500
    return json(res, status, { error: err?.message || 'Job request failed' })
  }
}
