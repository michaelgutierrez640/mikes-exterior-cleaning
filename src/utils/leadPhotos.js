/**
 * Client helpers for optional CRM lead photo uploads (Vercel Blob under lead-photos/).
 * Uses the same public store access mode as completed-jobs; paths stay unlisted.
 */
import {
  ACCEPTED_ACCEPT_ATTR,
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  prepareImageForUpload,
} from './projectPhotos'

export const MAX_LEAD_PHOTOS = 5
export const LEAD_PHOTO_ACCEPT = ACCEPTED_ACCEPT_ATTR
export const LEAD_PHOTO_TYPES = ACCEPTED_IMAGE_TYPES
export const LEAD_PHOTO_MAX_BYTES = MAX_UPLOAD_BYTES

export { prepareImageForUpload }

/**
 * Upload a prepared image into lead-photos/ storage.
 * Random suffix is added server-side; URLs are not listed on the public site.
 */
export async function uploadLeadPhoto(prepared, { onProgress, abortSignal } = {}) {
  const { upload } = await import('@vercel/blob/client')
  const safeName = (prepared.file.name || 'photo').replace(/[^a-zA-Z0-9._-]/g, '-')
  const pathname = `lead-photos/${Date.now()}-${safeName}`

  const blob = await upload(pathname, prepared.file, {
    // Must match the project's Blob store access mode (public), same as completed-jobs.
    access: 'public',
    handleUploadUrl: '/api/leads/blob-upload',
    contentType: prepared.contentType,
    multipart: prepared.file.size > 4 * 1024 * 1024,
    abortSignal,
    onUploadProgress: (event) => {
      if (typeof onProgress === 'function' && event?.percentage != null) {
        onProgress(Math.round(event.percentage))
      }
    },
  })

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType || prepared.contentType,
    size: prepared.file.size,
    originalName: prepared.file.name || safeName,
    access: 'public',
  }
}

/** Prefer direct blob URL; fall back to admin proxy for legacy private paths. */
export function leadPhotoAdminUrl(photo) {
  if (!photo) return ''
  if (typeof photo === 'string') {
    return `/api/leads?resource=lead-photo&pathname=${encodeURIComponent(photo)}`
  }
  if (photo.url && photo.access !== 'private') return photo.url
  if (photo.pathname) {
    return `/api/leads?resource=lead-photo&pathname=${encodeURIComponent(photo.pathname)}`
  }
  return photo.url || ''
}

/**
 * Best-effort cleanup for orphaned Blob uploads when lead create fails.
 * Safe to call with partial metadata; ignores missing tokens/paths.
 */
export async function deleteLeadPhotos(photos) {
  if (!Array.isArray(photos) || !photos.length) return
  try {
    const { del } = await import('@vercel/blob')
    const urls = photos.map((p) => p?.url).filter(Boolean)
    if (urls.length) {
      await del(urls, { token: undefined })
    }
  } catch {
    // Client-side delete may lack token; ignore — server GC / manual cleanup later.
  }
}
