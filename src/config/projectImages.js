/**
 * Shared project-image display constants (client + API).
 */

export const PROJECT_IMAGE_HOST_SUFFIX = '.public.blob.vercel-storage.com'
export const PROJECT_IMAGE_PATH_PREFIX = 'completed-jobs/'

/** Named display roles used by cards, gallery, and thumbnails. */
export const PROJECT_IMAGE_ROLES = {
  thumb: { widths: [240, 400], defaultWidth: 400, quality: 72 },
  card: { widths: [480, 800, 1200], defaultWidth: 800, quality: 78 },
  gallery: { widths: [800, 1200, 1600], defaultWidth: 1200, quality: 82 },
  fullscreen: { widths: [1600, 2048], defaultWidth: 2048, quality: 88 },
}

export function isAllowedProjectImageUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl || ''))
    if (url.protocol !== 'https:') return false
    if (!url.hostname.endsWith(PROJECT_IMAGE_HOST_SUFFIX)) return false
    if (!url.pathname.includes(PROJECT_IMAGE_PATH_PREFIX)) return false
    return true
  } catch {
    return false
  }
}

export function clampImageWidth(width, { min = 120, max = 2400 } = {}) {
  const n = Number(width)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function clampImageQuality(quality, fallback = 78) {
  const n = Number(quality)
  if (!Number.isFinite(n)) return fallback
  return Math.min(90, Math.max(40, Math.round(n)))
}
