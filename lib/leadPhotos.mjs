/**
 * Lead customer-photo helpers (private Vercel Blob under lead-photos/).
 * Photos are never listed on public site APIs or the sitemap.
 */

/** Customer photos attached to a CRM lead (private Vercel Blob under lead-photos/). */
export const MAX_LEAD_PHOTOS = 5
export const MAX_LEAD_PHOTO_BYTES = 10 * 1024 * 1024
export const LEAD_PHOTO_PATH_PREFIX = 'lead-photos/'
export const LEAD_PHOTO_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

function trimStr(value, max) {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  return s.slice(0, max)
}

/**
 * Normalize a public-ingest photos array.
 * @returns {{ ok: true, value: object[] } | { ok: false, error: string }}
 */
export function normalizeLeadPhotos(input) {
  if (input == null || input === '') {
    return { ok: true, value: [] }
  }
  if (!Array.isArray(input)) {
    return { ok: false, error: 'Photos must be an array' }
  }
  if (input.length > MAX_LEAD_PHOTOS) {
    return { ok: false, error: `At most ${MAX_LEAD_PHOTOS} photos allowed` }
  }

  const photos = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') {
      return { ok: false, error: 'Invalid photo entry' }
    }
    const pathname = trimStr(raw.pathname, 300)
    if (!pathname || !pathname.startsWith(LEAD_PHOTO_PATH_PREFIX)) {
      return { ok: false, error: 'Invalid photo storage path' }
    }
    if (pathname.includes('..') || pathname.includes('\\')) {
      return { ok: false, error: 'Invalid photo storage path' }
    }

    const contentType = trimStr(raw.contentType, 80)?.toLowerCase() || null
    if (contentType && !LEAD_PHOTO_CONTENT_TYPES.includes(contentType)) {
      return { ok: false, error: 'Unsupported photo type' }
    }

    let size = null
    if (raw.size !== undefined && raw.size !== null && raw.size !== '') {
      const n = Number(raw.size)
      if (!Number.isFinite(n) || n < 0 || n > MAX_LEAD_PHOTO_BYTES) {
        return { ok: false, error: 'Photo exceeds 10 MB limit' }
      }
      size = Math.round(n)
    }

    photos.push({
      pathname,
      url: trimStr(raw.url, 500),
      contentType,
      size,
      originalName: trimStr(raw.originalName, 160),
      access: 'private',
    })
  }

  return { ok: true, value: photos }
}

/** Whether a pathname is a safe lead-photo blob path. */
export function isSafeLeadPhotoPathname(pathname) {
  const p = String(pathname || '').trim()
  if (!p.startsWith(LEAD_PHOTO_PATH_PREFIX)) return false
  if (p.includes('..') || p.includes('\\') || p.includes('\0')) return false
  if (p.length > 300) return false
  return true
}
