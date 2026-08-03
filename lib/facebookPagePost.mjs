/**
 * Facebook Page photo-post helper (Meta Graph API).
 *
 * Required Vercel env vars (server-only — never expose to the browser):
 * - FACEBOOK_PAGE_ID
 * - FACEBOOK_PAGE_ACCESS_TOKEN
 * - FACEBOOK_GRAPH_API_VERSION  (e.g. v21.0)
 *
 * Optional:
 * - SITE_URL  (canonical https origin for project links; defaults to production)
 *
 * Never log FACEBOOK_PAGE_ACCESS_TOKEN.
 */

import { sanitizePublicText } from './sanitizePublicText.mjs'
import { projectCanonicalUrl } from './siteUrl.mjs'
import { CITY_SLUGS, SERVICE_SLUGS, updateProjectFacebookState } from './projectsStore.mjs'

export const FACEBOOK_POST_STATUSES = ['not_posted', 'pending', 'posted', 'failed']
export const FACEBOOK_REQUEST_TIMEOUT_MS = 15000
export const FACEBOOK_RECONCILE_TIMEOUT_MS = 8000
export const FACEBOOK_CAPTION_MAX = 2000
/** Keep blurbs short — do not paste full SEO job descriptions. */
export const FACEBOOK_BLURB_MAX = 100

const SERVICE_LABELS = {
  'window-cleaning': 'Window Cleaning',
  'pressure-washing': 'Pressure Washing',
  'solar-panel-cleaning': 'Solar Panel Cleaning',
  'gutter-cleaning': 'Gutter Cleaning',
  'residential-window-cleaning': 'Residential Window Cleaning',
  'pigeon-guard': 'Pigeon Guard',
}

const CITY_LABELS = {
  modesto: 'Modesto',
  salida: 'Salida',
  riverbank: 'Riverbank',
  oakdale: 'Oakdale',
  ripon: 'Ripon',
  turlock: 'Turlock',
  ceres: 'Ceres',
  manteca: 'Manteca',
  tracy: 'Tracy',
  stockton: 'Stockton',
  patterson: 'Patterson',
}

function envTrim(name) {
  return String(process.env[name] || '').trim()
}

/** Safe config probe — never reveals which values are missing. */
export function getFacebookConfigStatus() {
  const pageId = envTrim('FACEBOOK_PAGE_ID')
  const token = envTrim('FACEBOOK_PAGE_ACCESS_TOKEN')
  const version = envTrim('FACEBOOK_GRAPH_API_VERSION') || 'v21.0'
  const configured = Boolean(pageId && token && version)
  return {
    configured,
    version: configured ? version.replace(/^\/*/, '') : null,
  }
}

export function isFacebookConfigured() {
  return getFacebookConfigStatus().configured
}

export function serviceLabelForFacebook(slug) {
  const key = String(slug || '').trim()
  return SERVICE_LABELS[key] || key.replace(/-/g, ' ')
}

export function cityLabelForFacebook(slug) {
  const key = String(slug || '').trim()
  return CITY_LABELS[key] || key
}

/** One short teaser line — never the full project notes/SEO description. */
export function shortFacebookBlurb(notes, { maxLength = FACEBOOK_BLURB_MAX } = {}) {
  const cleaned = sanitizePublicText(notes, { maxLength: 300 })
  if (!cleaned) return 'Recent results from a Central Valley home.'
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned
  return sanitizePublicText(firstSentence, { maxLength }) || 'Recent results from a Central Valley home.'
}

export function buildDefaultFacebookCaption(project) {
  const service = serviceLabelForFacebook(project?.service)
  const city = cityLabelForFacebook(project?.city)
  const blurb = shortFacebookBlurb(project?.notes)
  const url = projectCanonicalUrl(project?.slug)
  const lines = [
    `${service} in ${city}, CA`,
    blurb || null,
    url || null,
    '',
    "Mike's Exterior Cleaning Services",
  ].filter((line) => line !== null)
  return sanitizeFacebookCaption(lines.join('\n'))
}

export function sanitizeFacebookCaption(value) {
  return sanitizePublicText(value, { maxLength: FACEBOOK_CAPTION_MAX })
}

export function validateFacebookImageUrl(url) {
  const value = String(url || '').trim()
  if (!/^https:\/\//i.test(value)) {
    return { ok: false, error: 'Featured image must be a public https URL' }
  }
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') {
      return { ok: false, error: 'Featured image must use https' }
    }
  } catch {
    return { ok: false, error: 'Featured image URL is invalid' }
  }
  return { ok: true, url: value }
}

export function validateFacebookProjectUrl(url) {
  const value = String(url || '').trim()
  if (!/^https:\/\//i.test(value)) {
    return { ok: false, error: 'Project URL must be a public https URL' }
  }
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') {
      return { ok: false, error: 'Project URL must use https' }
    }
    if (!parsed.pathname.startsWith('/projects/')) {
      return { ok: false, error: 'Project URL path is invalid' }
    }
  } catch {
    return { ok: false, error: 'Project URL is invalid' }
  }
  return { ok: true, url: value }
}

export function getFeaturedPhotoUrl(project) {
  // Facebook continues to use a still photo only — never a video URL.
  const photos = Array.isArray(project?.photos) ? project.photos : []
  const sorted = [...photos].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const image = sorted.find((item) => {
    const kind = String(item?.kind || '').toLowerCase()
    const type = String(item?.contentType || '').toLowerCase()
    const url = String(item?.url || '')
    if (kind === 'video' || type.startsWith('video/')) return false
    if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)) return false
    return Boolean(url.trim())
  })
  return String(image?.url || '').trim()
}

export function hasSuccessfulFacebookPost(project) {
  return Boolean(String(project?.facebookPostId || '').trim())
}

export function facebookStatusLabel(status) {
  switch (String(status || 'not_posted')) {
    case 'posted':
      return 'Posted to Facebook'
    case 'pending':
      return 'Facebook post pending'
    case 'failed':
      return 'Facebook posting failed'
    default:
      return 'Not posted to Facebook'
  }
}

export function isAmbiguousFacebookError(err) {
  const code = String(err?.code || '')
  const message = String(err?.message || '').toLowerCase()
  if (code === 'FACEBOOK_TIMEOUT') return true
  if (err?.name === 'AbortError') return true
  if (message.includes('timed out')) return true
  if (message.includes('timeout')) return true
  if (message.includes('network') && message.includes('fetch')) return true
  return false
}

function textContainsProjectUrl(text, projectUrl) {
  const hay = String(text || '')
  const needle = String(projectUrl || '').trim()
  if (!hay || !needle) return false
  if (hay.includes(needle)) return true
  try {
    const parsed = new URL(needle)
    // Match encoded or path-only variants Facebook sometimes stores.
    if (hay.includes(parsed.pathname)) return true
    if (hay.includes(encodeURIComponent(needle))) return true
  } catch {
    // ignore
  }
  return false
}

function safeErrorMessage(err) {
  let message = String(err?.message || err || 'Facebook request failed')
  const token = envTrim('FACEBOOK_PAGE_ACCESS_TOKEN')
  if (token) message = message.split(token).join('[redacted]')
  message = message.replace(/access_token=[^&\s]+/gi, 'access_token=[redacted]')
  return sanitizePublicText(message, { maxLength: 400 }) || 'Facebook request failed'
}

async function graphGetJson(pathWithQuery, { timeoutMs = FACEBOOK_RECONCILE_TIMEOUT_MS } = {}) {
  const config = getFacebookConfigStatus()
  if (!config.configured) {
    const err = new Error('Facebook is not connected')
    err.code = 'FACEBOOK_NOT_CONFIGURED'
    throw err
  }

  const token = envTrim('FACEBOOK_PAGE_ACCESS_TOKEN')
  const version = (envTrim('FACEBOOK_GRAPH_API_VERSION') || 'v21.0').replace(/^\/*/, '')
  const url = new URL(`https://graph.facebook.com/${version}/${pathWithQuery.replace(/^\//, '')}`)
  if (!url.searchParams.has('access_token')) {
    url.searchParams.set('access_token', token)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const graphMessage = data?.error?.message || `Facebook API error (${res.status})`
      const err = new Error(graphMessage)
      err.code = data?.error?.code || 'FACEBOOK_API_ERROR'
      err.status = res.status
      throw err
    }
    return data
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutErr = new Error('Facebook request timed out')
      timeoutErr.code = 'FACEBOOK_TIMEOUT'
      throw timeoutErr
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Look up an existing Page post that already contains this project's canonical URL.
 * Used to reconcile ambiguous timeouts and prevent duplicate Retry posts.
 *
 * @returns {Promise<{ postId: string, source: string } | null>}
 */
export async function findPagePostByProjectUrl(projectUrl, { timeoutMs = FACEBOOK_RECONCILE_TIMEOUT_MS } = {}) {
  const urlCheck = validateFacebookProjectUrl(projectUrl)
  if (!urlCheck.ok) return null
  if (!isFacebookConfigured()) return null

  const pageId = envTrim('FACEBOOK_PAGE_ID')
  const queries = [
    {
      source: 'published_posts',
      path: `${encodeURIComponent(pageId)}/published_posts?fields=id,message,permalink_url,created_time&limit=30`,
      pick: (item) => [item?.message, item?.permalink_url, item?.id],
    },
    {
      source: 'feed',
      path: `${encodeURIComponent(pageId)}/feed?fields=id,message,permalink_url,created_time&limit=30`,
      pick: (item) => [item?.message, item?.permalink_url, item?.id],
    },
    {
      source: 'photos',
      path: `${encodeURIComponent(pageId)}/photos?type=uploaded&fields=id,name,link,created_time&limit=30`,
      pick: (item) => [item?.name, item?.link, item?.id],
    },
  ]

  for (const query of queries) {
    try {
      const data = await graphGetJson(query.path, { timeoutMs })
      const items = Array.isArray(data?.data) ? data.data : []
      for (const item of items) {
        const haystacks = query.pick(item)
        if (haystacks.some((value) => textContainsProjectUrl(value, urlCheck.url))) {
          const postId = String(item?.id || '').trim()
          if (postId) return { postId, source: query.source }
        }
      }
    } catch (err) {
      console.error('[facebook] reconcile lookup failed', {
        source: query.source,
        code: err?.code || null,
        message: safeErrorMessage(err),
      })
    }
  }

  return null
}

/**
 * Call Graph API Page photos endpoint.
 * @returns {Promise<{ postId: string, raw: object }>}
 */
export async function postPhotoToFacebookPage({ imageUrl, caption, timeoutMs = FACEBOOK_REQUEST_TIMEOUT_MS }) {
  const config = getFacebookConfigStatus()
  if (!config.configured) {
    const err = new Error('Facebook is not connected')
    err.code = 'FACEBOOK_NOT_CONFIGURED'
    throw err
  }

  const imageCheck = validateFacebookImageUrl(imageUrl)
  if (!imageCheck.ok) {
    const err = new Error(imageCheck.error)
    err.code = 'FACEBOOK_INVALID_IMAGE'
    throw err
  }

  const cleanCaption = sanitizeFacebookCaption(caption)
  if (!cleanCaption) {
    const err = new Error('Facebook caption is empty')
    err.code = 'FACEBOOK_INVALID_CAPTION'
    throw err
  }

  const pageId = envTrim('FACEBOOK_PAGE_ID')
  const token = envTrim('FACEBOOK_PAGE_ACCESS_TOKEN')
  const version = (envTrim('FACEBOOK_GRAPH_API_VERSION') || 'v21.0').replace(/^\/*/, '')
  const endpoint = `https://graph.facebook.com/${version}/${encodeURIComponent(pageId)}/photos`

  const body = new URLSearchParams()
  body.set('url', imageCheck.url)
  body.set('caption', cleanCaption)
  body.set('published', 'true')
  body.set('access_token', token)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const graphMessage = data?.error?.message || `Facebook API error (${res.status})`
      const err = new Error(graphMessage)
      err.code = data?.error?.code || 'FACEBOOK_API_ERROR'
      err.status = res.status
      throw err
    }
    const postId = String(data?.post_id || data?.id || '').trim()
    if (!postId) {
      const err = new Error('Facebook API returned no post id')
      err.code = 'FACEBOOK_MISSING_POST_ID'
      throw err
    }
    return { postId, raw: { id: data.id || null, post_id: data.post_id || null } }
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutErr = new Error('Facebook request timed out')
      timeoutErr.code = 'FACEBOOK_TIMEOUT'
      throw timeoutErr
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** Whether a website save should attempt Facebook (not for edits of already-published jobs). */
export function shouldAttemptFacebookOnSave({ previous, project, postToFacebook }) {
  if (!postToFacebook) return false
  if (project?.status !== 'published') return false
  if (hasSuccessfulFacebookPost(project)) return false
  if (previous?.status === 'published') return false
  return true
}

async function markPosted(saveState, projectId, postId, caption) {
  return saveState(projectId, {
    facebookPostStatus: 'posted',
    facebookPostId: postId,
    facebookPostedAt: new Date().toISOString(),
    facebookPostError: null,
    facebookCaption: caption || null,
  })
}

/**
 * Post a published project to Facebook if requested / retried.
 * Idempotent: existing facebookPostId skips the Graph API call.
 * Ambiguous timeouts are reconciled against Page posts containing the project URL.
 *
 * @param {object} project
 * @param {{ caption?: string, forceRetry?: boolean }} [opts]
 * @param {object} [deps]
 */
export async function maybePostProjectToFacebook(project, opts = {}, deps = {}) {
  const saveState = deps.updateProjectFacebookState || updateProjectFacebookState
  const postPhoto = deps.postPhotoToFacebookPage || postPhotoToFacebookPage
  const findExisting = deps.findPagePostByProjectUrl || findPagePostByProjectUrl
  const configured = deps.isFacebookConfigured || isFacebookConfigured
  const projectId = String(project?.id || '').trim()
  if (!projectId) {
    return {
      project,
      skipped: true,
      reason: 'missing_project',
      status: project?.facebookPostStatus || 'not_posted',
    }
  }

  if (project?.status !== 'published') {
    return {
      project,
      skipped: true,
      reason: 'not_published',
      status: project?.facebookPostStatus || 'not_posted',
    }
  }

  // Never create duplicate Facebook posts once a post id exists.
  if (hasSuccessfulFacebookPost(project)) {
    return {
      project,
      skipped: true,
      reason: 'already_posted',
      status: 'posted',
      facebookPostId: project.facebookPostId,
    }
  }

  if (!SERVICE_SLUGS.includes(String(project.service || '')) || !CITY_SLUGS.includes(String(project.city || ''))) {
    const failed = await saveState(projectId, {
      facebookPostStatus: 'failed',
      facebookPostError: 'Job is missing a valid service or city for Facebook',
      facebookCaption: sanitizeFacebookCaption(opts.caption || project.facebookCaption || ''),
    })
    return { project: failed, skipped: false, status: 'failed', error: failed.facebookPostError }
  }

  if (!configured()) {
    const failed = await saveState(projectId, {
      facebookPostStatus: 'failed',
      facebookPostError: 'Facebook is not connected',
      facebookCaption: sanitizeFacebookCaption(opts.caption || buildDefaultFacebookCaption(project)),
    })
    return { project: failed, skipped: false, status: 'failed', error: failed.facebookPostError }
  }

  const caption = sanitizeFacebookCaption(opts.caption || project.facebookCaption || buildDefaultFacebookCaption(project))
  const projectUrl = projectCanonicalUrl(project.slug)
  const urlCheck = validateFacebookProjectUrl(projectUrl)
  if (!urlCheck.ok) {
    const failed = await saveState(projectId, {
      facebookPostStatus: 'failed',
      facebookPostError: urlCheck.error,
      facebookCaption: caption,
    })
    return { project: failed, skipped: false, status: 'failed', error: failed.facebookPostError }
  }

  const imageUrl = getFeaturedPhotoUrl(project)
  const imageCheck = validateFacebookImageUrl(imageUrl)
  if (!imageCheck.ok) {
    const failed = await saveState(projectId, {
      facebookPostStatus: 'failed',
      facebookPostError: imageCheck.error,
      facebookCaption: caption,
    })
    return { project: failed, skipped: false, status: 'failed', error: failed.facebookPostError }
  }

  // Ensure caption includes canonical URL (used later for reconcile matching).
  const captionWithUrl = caption.includes(projectUrl)
    ? caption
    : sanitizeFacebookCaption(`${caption}\n\n${projectUrl}`)

  // Reconcile first: if Facebook already has this project URL, adopt that post id.
  try {
    const existing = await findExisting(projectUrl)
    if (existing?.postId) {
      const posted = await markPosted(saveState, projectId, existing.postId, captionWithUrl)
      console.info('[facebook] reconciled existing post', {
        projectId,
        facebookPostId: existing.postId,
        source: existing.source || null,
      })
      return {
        project: posted,
        skipped: true,
        reason: 'reconciled_existing',
        status: 'posted',
        facebookPostId: existing.postId,
      }
    }
  } catch (err) {
    console.error('[facebook] pre-post reconcile failed', {
      projectId,
      message: safeErrorMessage(err),
    })
  }

  let pending = project
  try {
    pending = await saveState(projectId, {
      facebookPostStatus: 'pending',
      facebookPostError: null,
      facebookCaption: captionWithUrl,
    })
  } catch (err) {
    console.error('[facebook] failed to mark pending', { projectId, message: safeErrorMessage(err) })
  }

  try {
    const result = await postPhoto({
      imageUrl: imageCheck.url,
      caption: captionWithUrl,
    })
    const posted = await markPosted(saveState, projectId, result.postId, captionWithUrl)
    console.info('[facebook] posted', { projectId, facebookPostId: result.postId })
    return { project: posted, skipped: false, status: 'posted', facebookPostId: result.postId }
  } catch (err) {
    const message = safeErrorMessage(err)
    console.error('[facebook] post failed', {
      projectId,
      code: err?.code || null,
      status: err?.status || null,
      message,
    })

    // Ambiguous result (timeout/network): Facebook may have accepted the photo already.
    if (isAmbiguousFacebookError(err)) {
      try {
        const existing = await findExisting(projectUrl)
        if (existing?.postId) {
          const posted = await markPosted(saveState, projectId, existing.postId, captionWithUrl)
          console.info('[facebook] reconciled after ambiguous error', {
            projectId,
            facebookPostId: existing.postId,
            source: existing.source || null,
          })
          return {
            project: posted,
            skipped: false,
            reason: 'reconciled_after_timeout',
            status: 'posted',
            facebookPostId: existing.postId,
          }
        }
      } catch (reconcileErr) {
        console.error('[facebook] post-timeout reconcile failed', {
          projectId,
          message: safeErrorMessage(reconcileErr),
        })
      }
    }

    const failed = await saveState(projectId, {
      facebookPostStatus: 'failed',
      facebookPostError: message,
      facebookCaption: captionWithUrl,
    })
    return { project: failed || pending, skipped: false, status: 'failed', error: message }
  }
}
