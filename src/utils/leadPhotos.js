/**
 * Client helpers for optional CRM lead photo uploads (private Vercel Blob).
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
 * Upload a prepared image into private lead-photos/ storage.
 * Random suffix is added server-side; URLs are not listed publicly.
 */
export async function uploadLeadPhoto(prepared, { onProgress } = {}) {
  const { upload } = await import('@vercel/blob/client')
  const safeName = (prepared.file.name || 'photo').replace(/[^a-zA-Z0-9._-]/g, '-')
  const pathname = `lead-photos/${Date.now()}-${safeName}`

  const blob = await upload(pathname, prepared.file, {
    access: 'private',
    handleUploadUrl: '/api/leads/blob-upload',
    contentType: prepared.contentType,
    multipart: prepared.file.size > 4 * 1024 * 1024,
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
    access: 'private',
  }
}

/** Admin-only URL that streams a private lead photo with cookie auth. */
export function leadPhotoAdminUrl(pathname) {
  if (!pathname) return ''
  return `/api/leads?resource=lead-photo&pathname=${encodeURIComponent(pathname)}`
}
