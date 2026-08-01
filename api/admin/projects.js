import { json, requireAdmin } from '../../lib/adminAuth.mjs'
import { cleanupRemovedProjectPhotos, deleteBlobUrls } from '../../lib/projectBlobCleanup.mjs'
import {
  facebookStatusLabel,
  getFacebookConfigStatus,
  hasSuccessfulFacebookPost,
  maybePostProjectToFacebook,
  sanitizeFacebookCaption,
  shouldAttemptFacebookOnSave,
} from '../../lib/facebookPagePost.mjs'
import {
  addUploadedOurWorkPhotos,
  getHiddenOurWorkSrcs,
  hideStaticOurWorkPhoto,
  isOurWorkGalleryStorageConfigured,
  listPublishedJobPhotos,
  listStaticOurWorkPhotos,
  listUploadedOurWorkPhotos,
  listUploadedOurWorkPhotosForAdmin,
  removeUploadedOurWorkPhoto,
} from '../../lib/ourWorkGalleryStore.mjs'
import { OUR_WORK_IMAGE_LIBRARY } from '../../lib/ourWorkImageLibrary.mjs'
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
 * - POST /api/admin/projects?resource=our-work-gallery  body: { photos: [...] }
 * - DELETE /api/admin/projects?resource=our-work-gallery  body: { src, id?, kind? }
 * - GET /api/admin/projects?resource=facebook
 * - POST /api/admin/projects?resource=facebook&id=<projectId>  body: { action: 'retry', caption? }
 *
 * Query-param item routes avoid brittle dynamic /api/.../[id] matching behind the SPA rewrite.
 * Extra resources are folded into this function to stay within Vercel Hobby function limits.
 */

function stripFacebookRequestFields(body = {}) {
  const {
    postToFacebook: _postToFacebook,
    facebookCaption: _facebookCaption,
    facebookPostStatus: _facebookPostStatus,
    facebookPostId: _facebookPostId,
    facebookPostedAt: _facebookPostedAt,
    facebookPostError: _facebookPostError,
    ...projectBody
  } = body || {}
  return {
    projectBody,
    postToFacebook: Boolean(body?.postToFacebook),
    facebookCaption: sanitizeFacebookCaption(body?.facebookCaption || ''),
  }
}

function facebookResponseMeta(project, attempt = null) {
  const status = project?.facebookPostStatus || 'not_posted'
  return {
    configured: getFacebookConfigStatus().configured,
    status,
    label: facebookStatusLabel(status),
    facebookPostId: project?.facebookPostId || null,
    facebookPostedAt: project?.facebookPostedAt || null,
    facebookPostError: project?.facebookPostError || null,
    skipped: attempt?.skipped ?? null,
    reason: attempt?.reason || null,
  }
}

async function maybePublishToFacebook({ project, previous, postToFacebook, facebookCaption }) {
  if (!shouldAttemptFacebookOnSave({ previous, project, postToFacebook })) {
    const reason = !postToFacebook
      ? 'not_requested'
      : project?.status !== 'published'
        ? 'not_published'
        : hasSuccessfulFacebookPost(project)
          ? 'already_posted'
          : previous?.status === 'published'
            ? 'edit_existing_published'
            : 'skipped'
    return {
      project,
      attempt: {
        skipped: true,
        reason,
        status: project?.facebookPostStatus || (hasSuccessfulFacebookPost(project) ? 'posted' : 'not_posted'),
        facebookPostId: project?.facebookPostId || null,
      },
    }
  }

  const attempt = await maybePostProjectToFacebook(project, {
    caption: facebookCaption,
    forceRetry: false,
  })
  return { project: attempt.project || project, attempt }
}

async function handleOurWorkGallery(req, res) {
  if (!isOurWorkGalleryStorageConfigured()) {
    return json(res, 503, {
      error: 'Gallery storage not configured',
      hint: 'Connect Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)',
    })
  }

  if (req.method === 'GET') {
    const hiddenSrcs = await getHiddenOurWorkSrcs()
    const uploaded = listUploadedOurWorkPhotosForAdmin(await listUploadedOurWorkPhotos())
    const staticPhotos = listStaticOurWorkPhotos({ hiddenSrcs }).filter((p) => !p.hidden)
    const publishedJobPhotos = await listPublishedJobPhotos()
    return json(res, 200, {
      photos: [...uploaded, ...staticPhotos, ...publishedJobPhotos],
      hiddenSrcs,
      counts: {
        uploaded: uploaded.length,
        staticVisible: staticPhotos.length,
        publishedJob: publishedJobPhotos.length,
        hidden: hiddenSrcs.length,
      },
    })
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const action = String(body.action || '').trim()

    if (action === 'cleanup-orphans') {
      const urls = Array.isArray(body.urls) ? body.urls : []
      const existing = await listUploadedOurWorkPhotos()
      const kept = new Set(existing.map((p) => p.src))
      const orphans = [...new Set(urls.map((u) => String(u || '').trim()).filter(Boolean))]
        .filter((url) => /^https:\/\//i.test(url) && url.includes('gallery/our-work/') && !kept.has(url))
        .slice(0, 24)
      const result = orphans.length ? await deleteBlobUrls(orphans) : { deleted: 0, errors: [] }
      return json(res, 200, { ok: true, ...result })
    }

    const photos = Array.isArray(body.photos) ? body.photos : []
    try {
      const result = await addUploadedOurWorkPhotos(photos)
      return json(res, 201, {
        ok: true,
        added: result.added,
        photos: listUploadedOurWorkPhotosForAdmin(result.photos),
        message: `Added ${result.added.length} photo${result.added.length === 1 ? '' : 's'} to Our Work.`,
      })
    } catch (err) {
      // Best-effort cleanup of Blob objects that never made it into Redis.
      try {
        const existing = await listUploadedOurWorkPhotos()
        const kept = new Set(existing.map((p) => p.src))
        const orphanUrls = photos
          .map((p) => String(p?.src || p?.url || '').trim())
          .filter((url) => /^https:\/\//i.test(url) && url.includes('gallery/our-work/') && !kept.has(url))
        if (orphanUrls.length) await deleteBlobUrls(orphanUrls)
      } catch {
        /* ignore cleanup errors */
      }
      throw err
    }
  }

  if (req.method === 'DELETE') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const src = String(body.src || req.query?.src || '').trim()
    const id = String(body.id || '').trim()
    const kind = String(body.kind || '').trim()

    const isStaticLibrary = OUR_WORK_IMAGE_LIBRARY.some((entry) => entry.src === src)
    if (kind === 'uploaded' || id.startsWith('upl_') || (!isStaticLibrary && (id || src))) {
      const result = await removeUploadedOurWorkPhoto({ id, src })
      return json(res, 200, { ok: true, ...result })
    }

    const result = await hideStaticOurWorkPhoto(src)
    return json(res, 200, { ok: true, ...result })
  }

  res.setHeader('Allow', 'GET, POST, DELETE')
  return json(res, 405, { error: 'Method not allowed' })
}

async function handleFacebookResource(req, res) {
  if (req.method === 'GET') {
    const config = getFacebookConfigStatus()
    return json(res, 200, {
      configured: config.configured,
      message: config.configured
        ? 'Facebook Page posting is connected.'
        : 'Connect Facebook to enable automatic posting.',
    })
  }

  if (req.method === 'POST') {
    if (!isProjectsStorageConfigured()) {
      return json(res, 503, {
        error: 'Projects storage not configured',
        hint: 'Connect Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)',
      })
    }

    const itemId = normalizeProjectId(req.query?.id)
    if (!itemId) return json(res, 400, { error: 'Missing job id' })

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const action = String(body.action || '').trim()
    if (action !== 'retry') {
      return json(res, 400, { error: 'Unsupported Facebook action' })
    }

    const existing = await getProject(itemId)
    if (!existing) return json(res, 404, { error: 'Job not found', requestedId: itemId })
    if (existing.status !== 'published') {
      return json(res, 400, { error: 'Publish the job on the website before posting to Facebook' })
    }
    if (hasSuccessfulFacebookPost(existing)) {
      return json(res, 200, {
        ok: true,
        project: existing,
        facebook: facebookResponseMeta(existing, { skipped: true, reason: 'already_posted' }),
        message: 'Already posted to Facebook',
      })
    }

    const attempt = await maybePostProjectToFacebook(existing, {
      caption: sanitizeFacebookCaption(body.caption || existing.facebookCaption || ''),
      forceRetry: true,
    })
    return json(res, 200, {
      ok: attempt.status === 'posted',
      project: attempt.project,
      facebook: facebookResponseMeta(attempt.project, attempt),
      message:
        attempt.status === 'posted'
          ? 'Posted to Facebook'
          : attempt.error || 'Facebook posting failed',
    })
  }

  res.setHeader('Allow', 'GET, POST')
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

  if (resource === 'facebook') {
    try {
      return await handleFacebookResource(req, res)
    } catch (err) {
      console.error('[admin/projects facebook]', err?.message || err)
      const status = err?.status || 500
      return json(res, status, { error: err?.message || 'Facebook request failed' })
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
        return json(res, 200, {
          project,
          facebook: facebookResponseMeta(project),
        })
      }

      const status = String(req.query?.status || 'all')
      const allowed = ['all', 'draft', 'published']
      if (!allowed.includes(status)) {
        return json(res, 400, { error: 'status must be all, draft, or published' })
      }
      const projects = await listProjects(status)
      return json(res, 200, {
        projects,
        facebook: { configured: getFacebookConfigStatus().configured },
      })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const { projectBody, postToFacebook, facebookCaption } = stripFacebookRequestFields(body)
      let project = await createProject(projectBody)
      console.info('[admin/projects] created', { id: project.id, redisKey: `project:${project.id}` })

      const fb = await maybePublishToFacebook({
        project,
        previous: null,
        postToFacebook,
        facebookCaption,
      })
      project = fb.project
      return json(res, 201, {
        project,
        facebook: facebookResponseMeta(project, fb.attempt),
      })
    }

    if (req.method === 'PATCH') {
      if (!itemId) return json(res, 400, { error: 'Missing job id' })
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const existing = await getProject(itemId)
      if (!existing) return json(res, 404, { error: 'Job not found', requestedId: itemId })

      const { projectBody, postToFacebook, facebookCaption } = stripFacebookRequestFields(body)
      let project = await updateProject(itemId, projectBody)

      let blob = null
      if (Array.isArray(projectBody.photos)) {
        const before = new Set((existing.photos || []).map((p) => String(p?.url || '').trim()).filter(Boolean))
        const after = new Set((project.photos || []).map((p) => String(p?.url || '').trim()).filter(Boolean))
        const removed = [...before].filter((url) => !after.has(url))
        if (removed.length) {
          blob = await cleanupRemovedProjectPhotos(removed)
        }
      }

      const fb = await maybePublishToFacebook({
        project,
        previous: existing,
        postToFacebook,
        facebookCaption,
      })
      project = fb.project

      return json(res, 200, {
        project,
        blob,
        facebook: facebookResponseMeta(project, fb.attempt),
      })
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
