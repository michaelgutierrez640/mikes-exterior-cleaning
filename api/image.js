/**
 * On-demand optimized project images for cards / galleries / thumbnails.
 * Keeps archival originals in Blob; serves resized WebP/JPEG for display.
 *
 * GET /api/image?src=<blob-url>&w=800&q=78&fm=webp
 */
import sharp from 'sharp'
import {
  clampImageQuality,
  clampImageWidth,
  isAllowedProjectImageUrl,
} from '../lib/projectImageOptimize.mjs'

export const config = {
  maxDuration: 30,
  memory: 1024,
}

const FETCH_TIMEOUT_MS = 20000
const MAX_INPUT_BYTES = 12 * 1024 * 1024

function sendError(res, status, message) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.status(status).json({ error: message })
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return sendError(res, 405, 'Method not allowed')
  }

  const src = String(req.query?.src || '').trim()
  if (!isAllowedProjectImageUrl(src)) {
    return sendError(res, 400, 'Invalid image source')
  }

  const width = clampImageWidth(req.query?.w, { min: 120, max: 2400 }) || 800
  const quality = clampImageQuality(req.query?.q, 78)
  const formatRaw = String(req.query?.fm || 'webp').toLowerCase()
  const format = formatRaw === 'jpeg' || formatRaw === 'jpg' ? 'jpeg' : formatRaw === 'png' ? 'png' : 'webp'

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let upstream
    try {
      upstream = await fetch(src, {
        signal: controller.signal,
        headers: { Accept: 'image/*,*/*' },
      })
    } finally {
      clearTimeout(timer)
    }

    if (!upstream.ok) {
      return sendError(res, upstream.status === 404 ? 404 : 502, 'Upstream image unavailable')
    }

    const contentLength = Number(upstream.headers.get('content-length') || 0)
    if (contentLength > MAX_INPUT_BYTES) {
      return sendError(res, 413, 'Source image too large')
    }

    const input = Buffer.from(await upstream.arrayBuffer())
    if (!input.length || input.length > MAX_INPUT_BYTES) {
      return sendError(res, 413, 'Source image too large')
    }

    const meta = await sharp(input, { failOn: 'none', animated: false }).metadata()
    const pipeline = sharp(input, { failOn: 'none', animated: false }).rotate().resize({
      width,
      withoutEnlargement: true,
      fit: 'inside',
    })

    let output
    let contentType
    if (format === 'jpeg') {
      output = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer()
      contentType = 'image/jpeg'
    } else if (format === 'png') {
      output = await pipeline.png({ compressionLevel: 8 }).toBuffer()
      contentType = 'image/png'
    } else {
      output = await pipeline.webp({ quality }).toBuffer()
      contentType = 'image/webp'
    }

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('Vary', 'Accept')
    if (meta.width) res.setHeader('X-Image-Width', String(meta.width))
    if (meta.height) res.setHeader('X-Image-Height', String(meta.height))
    res.setHeader('Content-Length', String(output.length))

    if (req.method === 'HEAD') {
      return res.status(200).end()
    }
    return res.status(200).send(output)
  } catch (err) {
    console.error('[api/image]', err?.message || err)
    const aborted = err?.name === 'AbortError'
    return sendError(res, aborted ? 504 : 500, aborted ? 'Image fetch timed out' : 'Failed to optimize image')
  }
}
