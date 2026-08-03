/**
 * Client-side helpers for completed-job photo/video prep and Blob upload.
 * Re-encoding JPEG/PNG/WebP via canvas strips most EXIF/GPS metadata.
 * Videos upload directly (multipart) — never through a serverless request body.
 */
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  inferMediaKind,
  isVideoContentType,
  MAX_MEDIA_ITEMS,
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  RECOMMENDED_VIDEO_LENGTH,
  RECOMMENDED_VIDEO_SIZE,
  sanitizeUploadFilename,
} from '../../lib/projectMedia.mjs'

export {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_MEDIA_ITEMS,
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  RECOMMENDED_VIDEO_LENGTH,
  RECOMMENDED_VIDEO_SIZE,
}

/** @deprecated use MAX_MEDIA_ITEMS */
export const MAX_PHOTOS = MAX_MEDIA_ITEMS
/** @deprecated use MAX_PHOTO_BYTES */
export const MAX_UPLOAD_BYTES = MAX_PHOTO_BYTES

export const ACCEPTED_ACCEPT_ATTR = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  '.mp4',
  '.mov',
  '.webm',
  '.m4v',
].join(',')

function isHeic(file) {
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  return type.includes('heic') || type.includes('heif') || name.endsWith('.heic') || name.endsWith('.heif')
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image for preview'))
    img.src = src
  })
}

function formatMb(bytes) {
  return `${Math.round(bytes / (1024 * 1024))}`
}

function readVideoMetadata(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    const cleanup = () => {
      URL.revokeObjectURL(url)
    }
    video.onloadedmetadata = () => {
      const durationSeconds = Number.isFinite(video.duration) ? video.duration : null
      resolve({ previewUrl: url, durationSeconds, videoEl: video })
    }
    video.onerror = () => {
      cleanup()
      resolve({ previewUrl: URL.createObjectURL(file), durationSeconds: null, videoEl: null })
    }
    video.src = url
  })
}

/**
 * Capture a lightweight JPEG poster from the first decodable frame (free, no paid processor).
 */
async function captureVideoPoster(videoEl, basename = 'poster') {
  if (!videoEl) return null
  try {
    const width = videoEl.videoWidth || 0
    const height = videoEl.videoHeight || 0
    if (!width || !height) return null
    // Seek slightly forward so black first frames are less common.
    await new Promise((resolve) => {
      const onSeeked = () => {
        videoEl.removeEventListener('seeked', onSeeked)
        resolve()
      }
      videoEl.addEventListener('seeked', onSeeked)
      try {
        videoEl.currentTime = Math.min(0.25, Math.max(0, (videoEl.duration || 1) * 0.05))
      } catch {
        resolve()
      }
    })
    const maxW = 1280
    const scale = width > maxW ? maxW / width : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    if (!blob) return null
    const file = new File([blob], `${sanitizeUploadFilename(basename)}-poster.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
    return {
      file,
      previewUrl: URL.createObjectURL(file),
      contentType: 'image/jpeg',
      kind: 'photo',
      stripped: true,
    }
  } catch {
    return null
  }
}

export async function prepareVideoForUpload(file) {
  if (!file) throw new Error('No file selected')
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`"${file.name}" is larger than ${formatMb(MAX_VIDEO_BYTES)} MB`)
  }
  const type = (file.type || '').toLowerCase()
  if (!isVideoContentType(type, file.name)) {
    throw new Error(`Unsupported video type: ${file.name || type || 'unknown'}`)
  }

  const meta = await readVideoMetadata(file)
  let posterPrepared = null
  if (meta.videoEl) {
    posterPrepared = await captureVideoPoster(meta.videoEl, file.name.replace(/\.[^.]+$/, ''))
    try {
      meta.videoEl.removeAttribute('src')
      meta.videoEl.load()
    } catch {
      /* ignore */
    }
  }

  const contentType =
    type ||
    (file.name.toLowerCase().endsWith('.webm')
      ? 'video/webm'
      : file.name.toLowerCase().endsWith('.mov')
        ? 'video/quicktime'
        : 'video/mp4')

  return {
    file,
    previewUrl: meta.previewUrl,
    contentType,
    kind: 'video',
    stripped: false,
    durationSeconds: meta.durationSeconds,
    posterPrepared,
    movWarning: contentType === 'video/quicktime' || /\.mov$/i.test(file.name || ''),
  }
}

/**
 * Attempt to re-encode through canvas to strip EXIF. Falls back to original file
 * for HEIC (or any decode failure) so iPhone photos can still upload.
 */
export async function prepareImageForUpload(file) {
  if (!file) throw new Error('No file selected')
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error(`"${file.name}" is larger than ${formatMb(MAX_PHOTO_BYTES)} MB`)
  }

  const type = (file.type || '').toLowerCase()
  const allowed =
    type.startsWith('image/') ||
    ACCEPTED_IMAGE_TYPES.includes(type) ||
    /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || '')
  if (!allowed) {
    throw new Error(`Unsupported file type: ${file.name || type || 'unknown'}`)
  }

  if (isHeic(file)) {
    return {
      file,
      previewUrl: URL.createObjectURL(file),
      contentType: type || 'image/heic',
      kind: 'photo',
      stripped: false,
      heic: true,
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImageElement(objectUrl)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    if (!canvas.width || !canvas.height) {
      throw new Error('Invalid image dimensions')
    }
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)

    const outputType = type === 'image/png' ? 'image/png' : type === 'image/webp' ? 'image/webp' : 'image/jpeg'
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to process image'))),
        outputType,
        outputType === 'image/jpeg' ? 0.92 : undefined,
      )
    })

    const baseName = (file.name || 'photo').replace(/\.[^.]+$/, '')
    const ext = outputType === 'image/png' ? 'png' : outputType === 'image/webp' ? 'webp' : 'jpg'
    const prepared = new File([blob], `${baseName}.${ext}`, { type: outputType, lastModified: Date.now() })
    URL.revokeObjectURL(objectUrl)

    return {
      file: prepared,
      previewUrl: URL.createObjectURL(prepared),
      contentType: outputType,
      kind: 'photo',
      stripped: true,
      heic: false,
    }
  } catch {
    return {
      file,
      previewUrl: objectUrl,
      contentType: type || 'application/octet-stream',
      kind: 'photo',
      stripped: false,
      heic: false,
    }
  }
}

export async function prepareMediaForUpload(file) {
  if (!file) throw new Error('No file selected')
  if (isVideoContentType(file.type, file.name)) {
    return prepareVideoForUpload(file)
  }
  return prepareImageForUpload(file)
}

export async function uploadPreparedFile(prepared, { onProgress } = {}) {
  const { upload } = await import('@vercel/blob/client')
  const safeName = sanitizeUploadFilename(prepared.file.name || 'media')
  const pathname = `completed-jobs/${Date.now()}-${safeName}`
  const contentType = prepared.contentType || prepared.file.type || 'application/octet-stream'

  const blob = await upload(pathname, prepared.file, {
    access: 'public',
    handleUploadUrl: '/api/admin/blob-upload',
    contentType,
    multipart: prepared.file.size > 4 * 1024 * 1024,
    clientPayload: JSON.stringify({ contentType }),
    onUploadProgress: (event) => {
      if (typeof onProgress === 'function' && event?.percentage != null) {
        onProgress(Math.round(event.percentage))
      }
    },
  })

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType || contentType,
    size: prepared.file.size,
    kind: prepared.kind || inferMediaKind({ contentType, pathname: blob.pathname }),
  }
}
