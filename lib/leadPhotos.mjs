/**
 * Lead customer-photo helpers.
 *
 * IMPORTANT: The project's existing Vercel Blob store is PUBLIC (same store as
 * completed-jobs; URLs use *.public.blob.vercel-storage.com). Anyone with a
 * public Blob URL can view the file — `access: 'private'` in code does NOT make
 * a public store private.
 *
 * Customer photos must use a dedicated PRIVATE Blob store. Until
 * LEAD_PHOTOS_ENABLED=true + LEAD_PHOTOS_ACCESS=private +
 * LEAD_PHOTOS_BLOB_READ_WRITE_TOKEN are set, uploads stay disabled.
 */

/** Customer photos attached to a CRM lead (private Blob under lead-photos/). */
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
 * Uploads are off unless a dedicated private Blob store is explicitly configured.
 * Never enable against the shared public completed-jobs store.
 */
export function isLeadPhotoUploadEnabled() {
  const enabled = String(process.env.LEAD_PHOTOS_ENABLED || '')
    .trim()
    .toLowerCase()
  const access = String(process.env.LEAD_PHOTOS_ACCESS || '')
    .trim()
    .toLowerCase()
  const token = String(process.env.LEAD_PHOTOS_BLOB_READ_WRITE_TOKEN || '').trim()
  return (enabled === 'true' || enabled === '1' || enabled === 'yes') && access === 'private' && Boolean(token)
}

/** Token for the dedicated private lead-photos store (never the public completed-jobs store). */
export function getLeadPhotosBlobToken() {
  return String(process.env.LEAD_PHOTOS_BLOB_READ_WRITE_TOKEN || '').trim() || null
}

export function getLeadPhotosAccessMode() {
  return isLeadPhotoUploadEnabled() ? 'private' : null
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

    // Keep url server-side for deletion only. Admin presentation redacts it.
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

/** Redact raw Blob URLs before sending photo metadata to any browser client. */
export function presentLeadPhotosForClient(photos) {
  if (!Array.isArray(photos)) return []
  return photos.map((photo) => ({
    pathname: photo?.pathname || null,
    contentType: photo?.contentType || null,
    size: photo?.size ?? null,
    originalName: photo?.originalName || null,
    access: 'private',
    // Intentionally omit url — Admin must use the authenticated proxy.
  }))
}
