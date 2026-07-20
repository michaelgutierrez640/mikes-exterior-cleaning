/**
 * Client-side helpers for completed-job photo prep and Blob upload.
 * Generates compressed archival originals plus card/gallery/thumb display variants.
 * Supports JPEG, PNG, WebP, and HEIC/HEIF (converted when the browser cannot decode).
 */

import { PROJECT_IMAGE_ROLES } from '../config/projectImages'


export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

export const ACCEPTED_ACCEPT_ATTR =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif'

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_PHOTOS = 12

/** Archival original: keep detail, but shrink oversized phone dumps. */
const ORIGINAL_MAX_EDGE = 4096
const ORIGINAL_JPEG_QUALITY = 0.88

const VARIANT_SPECS = {
  thumb: { maxEdge: PROJECT_IMAGE_ROLES.thumb.defaultWidth, quality: 0.72, ext: 'webp', type: 'image/webp' },
  card: { maxEdge: PROJECT_IMAGE_ROLES.card.defaultWidth, quality: 0.78, ext: 'webp', type: 'image/webp' },
  gallery: { maxEdge: PROJECT_IMAGE_ROLES.gallery.defaultWidth, quality: 0.82, ext: 'webp', type: 'image/webp' },
}

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

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode image'))),
      type,
      quality,
    )
  })
}

function drawScaled(img, maxEdge) {
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  if (!srcW || !srcH) throw new Error('Invalid image dimensions')
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH))
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)
  return { canvas, width, height }
}

async function encodeVariant(img, { maxEdge, quality, type, ext, baseName }) {
  const { canvas, width, height } = drawScaled(img, maxEdge)
  const blob = await canvasToBlob(canvas, type, quality)
  const file = new File([blob], `${baseName}-${width}w.${ext}`, {
    type,
    lastModified: Date.now(),
  })
  return { file, width, height, contentType: type, size: blob.size }
}

async function encodeBlurDataUrl(img) {
  const { canvas } = drawScaled(img, 32)
  return canvas.toDataURL('image/jpeg', 0.45)
}

async function convertHeicToJpeg(file) {
  const heic2any = (await import('heic2any')).default
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92,
  })
  const blob = Array.isArray(result) ? result[0] : result
  if (!blob) throw new Error('HEIC conversion produced no data')
  const baseName = (file.name || 'photo').replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}

/**
 * Decode + generate archival original and display variants.
 * Falls back carefully so HEIC uploads still work when conversion fails.
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

  let working = file
  let convertedFromHeic = false

  if (isHeic(file)) {
    try {
      working = await convertHeicToJpeg(file)
      convertedFromHeic = true
    } catch {
      // Safari may still decode HEIC natively below; otherwise upload original.
      working = file
    }
  }

  const objectUrl = URL.createObjectURL(working)
  try {
    const img = await loadImageElement(objectUrl)
    const baseName = (working.name || file.name || 'photo').replace(/\.[^.]+$/, '').slice(0, 80) || 'photo'

    const original = await encodeVariant(img, {
      maxEdge: ORIGINAL_MAX_EDGE,
      quality: ORIGINAL_JPEG_QUALITY,
      type: 'image/jpeg',
      ext: 'jpg',
      baseName: `${baseName}-original`,
    })

    const thumb = await encodeVariant(img, { ...VARIANT_SPECS.thumb, baseName: `${baseName}-thumb` })
    const card = await encodeVariant(img, { ...VARIANT_SPECS.card, baseName: `${baseName}-card` })
    const gallery = await encodeVariant(img, { ...VARIANT_SPECS.gallery, baseName: `${baseName}-gallery` })
    const blurDataUrl = await encodeBlurDataUrl(img)

    URL.revokeObjectURL(objectUrl)

    return {
      file: original.file,
      previewUrl: URL.createObjectURL(card.file),
      contentType: original.contentType,
      stripped: true,
      heic: convertedFromHeic || isHeic(file),
      width: original.width,
      height: original.height,
      blurDataUrl,
      variants: {
        original,
        gallery,
        card,
        thumb,
      },
    }
  } catch (err) {
    // Last resort: upload the (possibly HEIC) file as-is for archival; display uses /api/image later if possible.
    return {
      file: working,
      previewUrl: objectUrl,
      contentType: working.type || type || 'application/octet-stream',
      stripped: false,
      heic: isHeic(file),
      width: null,
      height: null,
      blurDataUrl: null,
      variants: null,
      prepareError: err?.message || 'decode failed',
    }
  }
}

async function uploadSingleFile(file, contentType, { onProgress } = {}) {
  const { upload } = await import('@vercel/blob/client')
  const pathname = `completed-jobs/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`

  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/admin/blob-upload',
    contentType,
    multipart: file.size > 4 * 1024 * 1024,
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
    size: file.size,
  }
}

/**
 * Upload archival original + display variants. Progress is overall 0–100.
 */
export async function uploadPreparedFile(prepared, { onProgress } = {}) {
  const report = (pct) => {
    if (typeof onProgress === 'function') onProgress(Math.max(0, Math.min(100, Math.round(pct))))
  }

  const variantEntries = prepared.variants
    ? [
        ['original', prepared.variants.original],
        ['gallery', prepared.variants.gallery],
        ['card', prepared.variants.card],
        ['thumb', prepared.variants.thumb],
      ].filter(([, v]) => v?.file)
    : [['original', { file: prepared.file, contentType: prepared.contentType }]]

  const uploaded = {}
  for (let i = 0; i < variantEntries.length; i += 1) {
    const [key, variant] = variantEntries[i]
    const meta = await uploadSingleFile(variant.file, variant.contentType || prepared.contentType, {
      onProgress: (pct) => {
        const base = (i / variantEntries.length) * 100
        const slice = pct / variantEntries.length
        report(base + slice)
      },
    })
    uploaded[key] = meta
  }

  report(100)

  const original = uploaded.original
  return {
    url: original.url,
    pathname: original.pathname,
    contentType: original.contentType,
    size: original.size,
    width: prepared.width ?? null,
    height: prepared.height ?? null,
    blurDataUrl: prepared.blurDataUrl || null,
    variants: {
      gallery: uploaded.gallery?.url || null,
      card: uploaded.card?.url || null,
      thumb: uploaded.thumb?.url || null,
    },
    variantPathnames: {
      gallery: uploaded.gallery?.pathname || null,
      card: uploaded.card?.pathname || null,
      thumb: uploaded.thumb?.pathname || null,
    },
  }
}
