import { del } from '@vercel/blob'
import { json, requireAdmin } from '../../../lib/adminAuth.mjs'
import {
  deleteProject,
  getProject,
  isProjectsStorageConfigured,
  updateProject,
} from '../../../lib/projectsStore.mjs'

function getId(req) {
  return String(req.query?.id || '').trim()
}

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
  if (!id) return json(res, 400, { error: 'Missing job id' })

  try {
    if (req.method === 'GET') {
      const project = await getProject(id)
      if (!project) return json(res, 404, { error: 'Job not found' })
      return json(res, 200, { project })
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const project = await updateProject(id, body)
      return json(res, 200, { project })
    }

    if (req.method === 'DELETE') {
      const existing = await deleteProject(id)
      const blobResult = await deleteBlobUrls(existing)
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
