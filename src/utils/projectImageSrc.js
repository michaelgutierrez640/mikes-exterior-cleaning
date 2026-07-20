/**
 * Resolve optimized project image sources for cards, gallery, and thumbs.
 * Prefers uploaded variants; falls back to /api/image for legacy full-size blobs.
 */
import { PROJECT_IMAGE_ROLES, isAllowedProjectImageUrl } from '../config/projectImages'


function apiImageUrl(src, width, { quality, format = 'webp' } = {}) {
  const params = new URLSearchParams({
    src,
    w: String(width),
    q: String(quality),
    fm: format,
  })
  return `/api/image?${params.toString()}`
}

function roleConfig(role) {
  return PROJECT_IMAGE_ROLES[role] || PROJECT_IMAGE_ROLES.card
}

/**
 * @param {object} photo
 * @param {'thumb'|'card'|'gallery'|'fullscreen'} role
 * @param {{ sizes?: string }} [opts]
 */
export function getProjectImageSources(photo, role = 'card', opts = {}) {
  const url = photo?.url
  if (!url) return null

  const config = roleConfig(role)
  const sizes = opts.sizes || defaultSizesForRole(role)
  const blurDataUrl = typeof photo.blurDataUrl === 'string' && photo.blurDataUrl.startsWith('data:')
    ? photo.blurDataUrl
    : null
  const width = Number.isFinite(Number(photo.width)) ? Number(photo.width) : null
  const height = Number.isFinite(Number(photo.height)) ? Number(photo.height) : null
  const aspectRatio = width && height ? `${width} / ${height}` : null

  // Uploaded display variants (new uploads)
  const variantUrl =
    role === 'thumb'
      ? photo.variants?.thumb || photo.variants?.card || photo.variants?.gallery
      : role === 'card'
        ? photo.variants?.card || photo.variants?.gallery || photo.variants?.thumb
        : role === 'gallery'
          ? photo.variants?.gallery || photo.variants?.card
          : null

  if (variantUrl && role !== 'fullscreen') {
    const srcSetParts = []
    if (photo.variants?.thumb) srcSetParts.push(`${photo.variants.thumb} ${PROJECT_IMAGE_ROLES.thumb.defaultWidth}w`)
    if (photo.variants?.card) srcSetParts.push(`${photo.variants.card} ${PROJECT_IMAGE_ROLES.card.defaultWidth}w`)
    if (photo.variants?.gallery) srcSetParts.push(`${photo.variants.gallery} ${PROJECT_IMAGE_ROLES.gallery.defaultWidth}w`)

    return {
      src: variantUrl,
      srcSet: srcSetParts.length ? srcSetParts.join(', ') : undefined,
      sizes,
      blurDataUrl,
      width,
      height,
      aspectRatio,
      originalUrl: url,
      optimized: true,
    }
  }

  // Fullscreen / lightbox: prefer archival original
  if (role === 'fullscreen') {
    if (isAllowedProjectImageUrl(url)) {
      const srcSet = config.widths
        .map((w) => `${apiImageUrl(url, w, { quality: config.quality })} ${w}w`)
        .join(', ')
      return {
        src: apiImageUrl(url, config.defaultWidth, { quality: config.quality }),
        srcSet,
        sizes: opts.sizes || '100vw',
        blurDataUrl,
        width,
        height,
        aspectRatio,
        originalUrl: url,
        optimized: true,
      }
    }
    return {
      src: url,
      sizes: opts.sizes || '100vw',
      blurDataUrl,
      width,
      height,
      aspectRatio,
      originalUrl: url,
      optimized: false,
    }
  }

  // Legacy photos: on-demand /api/image resize (never load multi‑MB original in UI)
  if (isAllowedProjectImageUrl(url)) {
    const srcSet = config.widths
      .map((w) => `${apiImageUrl(url, w, { quality: config.quality })} ${w}w`)
      .join(', ')
    return {
      src: apiImageUrl(url, config.defaultWidth, { quality: config.quality }),
      srcSet,
      sizes,
      blurDataUrl,
      width,
      height,
      aspectRatio,
      originalUrl: url,
      optimized: true,
    }
  }

  return {
    src: url,
    sizes,
    blurDataUrl,
    width,
    height,
    aspectRatio,
    originalUrl: url,
    optimized: false,
  }
}

function defaultSizesForRole(role) {
  if (role === 'thumb') return '80px'
  if (role === 'card') return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px'
  if (role === 'gallery') return '(max-width: 768px) 100vw, min(960px, 70vw)'
  return '100vw'
}
