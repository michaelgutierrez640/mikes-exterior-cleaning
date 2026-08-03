/** Canonical production URL — update when domain is live. */
export const SITE_URL = 'https://www.mikesexteriorcleaning.com'

/**
 * Default Open Graph / social share image (1200×630).
 * Versioned filename busts iMessage / Facebook / Slack caches when the art changes.
 */
export const DEFAULT_OG_IMAGE_PATH = '/images/brand/mikes-exterior-og-share-v20260802.png'
export const DEFAULT_OG_IMAGE = `${SITE_URL}${DEFAULT_OG_IMAGE_PATH}`
export const DEFAULT_OG_IMAGE_WIDTH = 1200
export const DEFAULT_OG_IMAGE_HEIGHT = 630
export const DEFAULT_OG_IMAGE_TYPE = 'image/png'

export function absoluteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}
