import sharp from 'sharp'

/**
 * Public image resize proxy for Completed Job blob photos.
 * Serves WebP thumbnails for gallery/project UI; originals stay untouched for lightbox/detail.
 *
 * GET /api/img?url=<blob-url>&w=800
 */

const ALLOWED_HOST = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i
const MAX_UPSTREAM_BYTES = 18 * 1024 * 1024

function json(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.status(status).json(payload)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const rawUrl = String(req.query?.url || '').trim()
  if (!ALLOWED_HOST.test(rawUrl)) {
    return json(res, 400, { error: 'Unsupported image host' })
  }

  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    return json(res, 400, { error: 'Invalid url' })
  }
  if (parsed.protocol !== 'https:') {
    return json(res, 400, { error: 'Invalid url' })
  }

  const width = Math.min(Math.max(Number.parseInt(String(req.query?.w || '800'), 10) || 800, 160), 1600)

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { Accept: 'image/*' },
      redirect: 'follow',
    })
    if (!upstream.ok) {
      return json(res, 502, { error: 'Upstream image unavailable' })
    }

    const contentLength = Number(upstream.headers.get('content-length') || 0)
    if (contentLength > MAX_UPSTREAM_BYTES) {
      return json(res, 413, { error: 'Image too large' })
    }

    const buffer = Buffer.from(await upstream.arrayBuffer())
    if (buffer.byteLength > MAX_UPSTREAM_BYTES) {
      return json(res, 413, { error: 'Image too large' })
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
    console.error('[api/img]', err?.message || err)
    return json(res, 500, { error: 'Image processing failed' })
  }
}
