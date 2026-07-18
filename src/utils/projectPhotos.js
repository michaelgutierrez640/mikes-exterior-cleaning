/**
 * Client-side helpers for completed-job photo prep and Blob upload.
 * Re-encoding JPEG/PNG/WebP via canvas strips most EXIF/GPS metadata.
 */

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

export const ACCEPTED_ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif'

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_PHOTOS = 12

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

/**
 * Attempt to re-encode through canvas to strip EXIF. Falls back to original file
 * for HEIC (or any decode failure) so iPhone photos can still upload.
 */
export async function prepareImageForUpload(file) {
  if (!file) throw new Error('No file selected')
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`"${file.name}" is larger than 10 MB`)
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
      stripped: true,
      heic: false,
    }
  } catch {
    return {
      file,
      previewUrl: objectUrl,
      contentType: type || 'application/octet-stream',
      stripped: false,
      heic: false,
    }
  }
}

export async function uploadPreparedFile(prepared, { onProgress } = {}) {
  const { upload } = await import('@vercel/blob/client')
  const pathname = `completed-jobs/${Date.now()}-${prepared.file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`

  const blob = await upload(pathname, prepared.file, {
    access: 'public',
    handleUploadUrl: '/api/admin/blob-upload',
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
  }
}
