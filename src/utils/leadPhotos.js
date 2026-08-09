/**
 * Client helpers for optional CRM lead photo uploads.
 *
 * Uploads stay disabled until a dedicated PRIVATE Vercel Blob store is configured.
 * The shared completed-jobs store is PUBLIC — anyone with a Blob URL can view files.
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

/**
 * Preview/Production gate: off until private store env is wired and client flag flipped.
 * Server independently rejects uploads unless LEAD_PHOTOS_* private env is set.
 */
export const LEAD_PHOTO_UPLOADS_ENABLED = false

export { prepareImageForUpload }

/**
 * Upload a prepared image into a PRIVATE lead-photos store.
 * Disabled by default — do not call unless LEAD_PHOTO_UPLOADS_ENABLED is true.
 */
export async function uploadLeadPhoto(prepared, { onProgress, abortSignal } = {}) {
  if (!LEAD_PHOTO_UPLOADS_ENABLED) {
    throw new Error('Customer photo uploads are temporarily disabled.')
  }

  const { upload } = await import('@vercel/blob/client')
  const safeName = (prepared.file.name || 'photo').replace(/[^a-zA-Z0-9._-]/g, '-')
  const pathname = `lead-photos/${Date.now()}-${safeName}`

  const blob = await upload(pathname, prepared.file, {
    access: 'private',
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
    // Keep url only in memory for attach/delete; never render it in the UI.
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType || prepared.contentType,
    size: prepared.file.size,
    originalName: prepared.file.name || safeName,
    access: 'private',
  }
}

/** Admin-only authenticated proxy URL. Never returns a raw Blob URL. */
export function leadPhotoAdminUrl(photo) {
  if (!photo) return ''
  const pathname = typeof photo === 'string' ? photo : photo.pathname
  if (!pathname) return ''
  return `/api/leads?resource=lead-photo&pathname=${encodeURIComponent(pathname)}`
}

/**
 * Best-effort cleanup for orphaned Blob uploads when lead create fails.
 * Requires server-side token in practice; client delete is a no-op without credentials.
 */
export async function deleteLeadPhotos() {
  // Client cannot safely delete private blobs without exposing store credentials.
  return
}
