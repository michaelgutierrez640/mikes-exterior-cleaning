import sharp from 'sharp'
import {
  getPublicProjectBySlug,
  isPublicProjectsConfigured,
  listPublicProjects,
} from '../lib/projectsPublic.mjs'
import {
  getHiddenOurWorkSrcs,
  isOurWorkGalleryStorageConfigured,
  listPublicOurWorkJobPhotos,
} from '../lib/ourWorkGalleryStore.mjs'

const BLOB_IMAGE_HOST = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i
const MAX_UPSTREAM_BYTES = 18 * 1024 * 1024

function jsonPublic(res, status, payload, { cacheable = false } = {}) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader(
    'Cache-Control',
    cacheable ? 'public, s-maxage=60, stale-while-revalidate=300' : 'no-store',
  )
  res.status(status).json(payload)
}

async function serveOptimizedBlobImage(req, res) {
  const rawUrl = String(req.query?.url || '').trim()
  if (!BLOB_IMAGE_HOST.test(rawUrl)) {
    return jsonPublic(res, 400, { error: 'Unsupported image host' })
  }

  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    return jsonPublic(res, 400, { error: 'Invalid url' })
  }
  if (parsed.protocol !== 'https:') {
    return jsonPublic(res, 400, { error: 'Invalid url' })
  }

  const width = Math.min(Math.max(Number.parseInt(String(req.query?.w || '800'), 10) || 800, 160), 1600)

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { Accept: 'image/*' },
      redirect: 'follow',
    })
    if (!upstream.ok) {
      return jsonPublic(res, 502, { error: 'Upstream image unavailable' })
    }

    const contentLength = Number(upstream.headers.get('content-length') || 0)
    if (contentLength > MAX_UPSTREAM_BYTES) {
      return jsonPublic(res, 413, { error: 'Image too large' })
    }

    const buffer = Buffer.from(await upstream.arrayBuffer())
    if (buffer.byteLength > MAX_UPSTREAM_BYTES) {
      return jsonPublic(res, 413, { error: 'Image too large' })
    }

    const output = await sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({
        width,
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({ quality: 78, effort: 4 })
      .toBuffer()

    res.setHeader('Content-Type', 'image/webp')
    res.setHeader('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return res.status(200).send(output)
  } catch (err) {
    console.error('[api/projects img]', err?.message || err)
    return jsonPublic(res, 500, { error: 'Image processing failed' })
  }
}

/**
 * Public read-only projects API (published jobs only).
 * - GET /api/projects?limit=&service=&city=
 * - GET /api/projects?slug=
 * - GET /api/projects?resource=our-work-gallery  (hidden static srcs + published job photos)
 * - GET /api/projects?resource=img&url=&w=  (resized WebP thumb for blob job photos)
 *
 * Never returns drafts, admin IDs, Blob paths, or Redis credentials.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return jsonPublic(res, 405, { error: 'Method not allowed' })
  }

  const resource = String(req.query?.resource || '').trim()
  if (resource === 'img') {
    return serveOptimizedBlobImage(req, res)
  }

  if (resource === 'our-work-gallery') {
    try {
      const [hiddenSrcs, jobPhotos] = await Promise.all([
        isOurWorkGalleryStorageConfigured() ? getHiddenOurWorkSrcs() : Promise.resolve([]),
        isPublicProjectsConfigured() ? listPublicOurWorkJobPhotos() : Promise.resolve([]),
      ])
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
      return jsonPublic(res, 200, { hiddenSrcs, jobPhotos }, { cacheable: true })
    } catch (err) {
      console.error('[api/projects our-work-gallery]', err?.message || err)
      return jsonPublic(res, 200, { hiddenSrcs: [], jobPhotos: [] })
    }
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
