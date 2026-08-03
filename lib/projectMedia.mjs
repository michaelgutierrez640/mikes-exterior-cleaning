/**
 * Shared Completed Job media constants and helpers (photos + videos).
 * Used by store validation, blob upload, and tests.
 */

export const MEDIA_KINDS = ['photo', 'video']

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime', // iPhone MOV
  'video/webm',
  'video/x-m4v',
]

/** Photos stay at 10 MB; videos use a higher direct-to-Blob ceiling. */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
/** ~100 MB — practical phone clips via multipart Blob upload (no serverless body). */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024
/** Combined photo + video items per job (preserves previous 12-slot budget). */
export const MAX_MEDIA_ITEMS = 12

/** Guidance shown in admin UI (not a hard server duration cut). */
export const RECOMMENDED_VIDEO_LENGTH =
  'Keep clips about 15–60 seconds (90 seconds max recommended) so pages stay fast.'

export const RECOMMENDED_VIDEO_SIZE =
  'Use H.264 MP4 when possible. Max upload size is 100 MB per video (10 MB per photo).'

export function isImageContentType(contentType = '', filename = '') {
  const type = String(contentType || '').toLowerCase()
  const name = String(filename || '').toLowerCase()
  if (ACCEPTED_IMAGE_TYPES.includes(type) || type.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(name)
}

export function isVideoContentType(contentType = '', filename = '') {
  const type = String(contentType || '').toLowerCase()
  const name = String(filename || '').toLowerCase()
  if (ACCEPTED_VIDEO_TYPES.includes(type) || type.startsWith('video/')) return true
  return /\.(mp4|mov|webm|m4v)$/i.test(name)
}

export function inferMediaKind(item = {}) {
  const explicit = String(item.kind || '').toLowerCase()
  if (MEDIA_KINDS.includes(explicit)) return explicit
  const contentType = item.contentType || ''
  const filename = item.pathname || item.url || ''
  if (isVideoContentType(contentType, filename)) return 'video'
  return 'photo'
}

export function isPhotoMedia(item) {
  return inferMediaKind(item) === 'photo'
}

export function isVideoMedia(item) {
  return inferMediaKind(item) === 'video'
}

export function maxBytesForContentType(contentType = '', filename = '') {
  return isVideoContentType(contentType, filename) ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES
}

export function sanitizeUploadFilename(name = 'media') {
  const base = String(name || 'media')
    .split(/[/\\]/)
    .pop()
  return base.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120) || 'media'
}

/** First image suitable for Facebook / OG / card covers. */
export function getCoverPhoto(media = []) {
  const list = Array.isArray(media) ? media : []
  const sorted = [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const after = sorted.find((item) => isPhotoMedia(item) && item.label === 'after' && item.url)
  if (after) return after
  return sorted.find((item) => isPhotoMedia(item) && item.url) || null
}

export function countMediaByKind(media = []) {
  const list = Array.isArray(media) ? media : []
  let photos = 0
  let videos = 0
  for (const item of list) {
    if (isVideoMedia(item)) videos += 1
    else photos += 1
  }
  return { photos, videos, total: list.length }
}
