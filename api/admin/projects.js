import { json, requireAdmin } from '../../lib/adminAuth.mjs'
import { cleanupRemovedProjectPhotos, deleteBlobUrls } from '../../lib/projectBlobCleanup.mjs'
import {
  getHiddenOurWorkSrcs,
  hideStaticOurWorkPhoto,
  isOurWorkGalleryStorageConfigured,
  listPublishedJobPhotos,
  listStaticOurWorkPhotos,
} from '../../lib/ourWorkGalleryStore.mjs'
import {
  createProject,
  deleteProject,
  getProject,
  isProjectsStorageConfigured,
  listProjects,
  normalizeProjectId,
  updateProject,
} from '../../lib/projectsStore.mjs'

/**
 * Collection + item operations on one stable path:
 * - GET /api/admin/projects?status=draft|published|all
 * - GET /api/admin/projects?id=<projectId>
 * - POST /api/admin/projects
 * - PATCH /api/admin/projects?id=<projectId>
 * - DELETE /api/admin/projects?id=<projectId>
 * - GET /api/admin/projects?resource=our-work-gallery
 * - DELETE /api/admin/projects?resource=our-work-gallery  body: { src }
 *
 * Query-param item routes avoid brittle dynamic /api/.../[id] matching behind the SPA rewrite.
 * Our Work gallery is folded into this function to stay within Vercel Hobby function limits.
 */
async function handleOurWorkGallery(req, res) {
  if (!isOurWorkGalleryStorageConfigured()) {
    return json(res, 503, {
      error: 'Gallery storage not configured',
      hint: 'Connect Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)',
    })
  }

  if (req.method === 'GET') {
    const hiddenSrcs = await getHiddenOurWorkSrcs()
    const staticPhotos = listStaticOurWorkPhotos({ hiddenSrcs }).filter((p) => !p.hidden)
    const publishedJobPhotos = await listPublishedJobPhotos()
    return json(res, 200, {
      photos: [...staticPhotos, ...publishedJobPhotos],
      hiddenSrcs,
      counts: {
        staticVisible: staticPhotos.length,
        publishedJob: publishedJobPhotos.length,
        hidden: hiddenSrcs.length,
      },
    })
  }

  if (req.method === 'DELETE') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const src = String(body.src || req.query?.src || '').trim()
    const result = await hideStaticOurWorkPhoto(src)
    return json(res, 200, { ok: true, ...result })
  }

  res.setHeader('Allow', 'GET, DELETE')
  return json(res, 405, { error: 'Method not allowed' })
}

export default async function handler(req, res) {
  const auth = requireAdmin(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  const resource = String(req.query?.resource || '').trim()
  if (resource === 'our-work-gallery') {
    try {
      return await handleOurWorkGallery(req, res)
    } catch (err) {
      console.error('[admin/projects our-work-gallery]', err?.message || err)
      const status = err?.status || 500
      return json(res, status, { error: err?.message || 'Our Work gallery request failed' })
    }
  }

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
      const existing = await getProject(itemId)
      if (!existing) return json(res, 404, { error: 'Job not found', requestedId: itemId })

      const project = await updateProject(itemId, body)

      let blob = null
      if (Array.isArray(body.photos)) {
        const before = new Set((existing.photos || []).map((p) => String(p?.url || '').trim()).filter(Boolean))
        const after = new Set((project.photos || []).map((p) => String(p?.url || '').trim()).filter(Boolean))
        const removed = [...before].filter((url) => !after.has(url))
        if (removed.length) {
          // After update, removed URLs are gone from this project. Delete Blob
          // objects only when no other project still references them.
          blob = await cleanupRemovedProjectPhotos(removed)
        }
      }

      return json(res, 200, { project, blob })
    }

    if (req.method === 'DELETE') {
      if (!itemId) return json(res, 400, { error: 'Missing job id' })
      const existing = await deleteProject(itemId)
      const blobResult = await deleteBlobUrls((existing?.photos || []).map((p) => p.url).filter(Boolean))
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
