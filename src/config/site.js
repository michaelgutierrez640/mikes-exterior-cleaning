/** Canonical production URL — update when domain is live. */
export const SITE_URL = 'https://www.mikesexteriorcleaning.com'

/**
 * Official transparent brand logo (nav, footer, structured data).
 * Absolute HTTPS Production URL for schema / crawlers.
 */
export const BRAND_LOGO_PATH = '/images/brand/mikes-exterior-logo.png'
export const BRAND_LOGO = `${SITE_URL}${BRAND_LOGO_PATH}`
export const BRAND_LOGO_WIDTH = 905
export const BRAND_LOGO_HEIGHT = 536
export const BRAND_LOGO_ALT = "Mike's Exterior Cleaning Services logo"

/**
 * Default Open Graph / social share image (1200×630).
 * Versioned filename busts iMessage / Facebook / Slack caches when the art changes.
 */
export const DEFAULT_OG_IMAGE_PATH = '/images/brand/mikes-exterior-og-share-v20260807.png'
export const DEFAULT_OG_IMAGE = `${SITE_URL}${DEFAULT_OG_IMAGE_PATH}`
export const DEFAULT_OG_IMAGE_WIDTH = 1200
export const DEFAULT_OG_IMAGE_HEIGHT = 630
export const DEFAULT_OG_IMAGE_TYPE = 'image/png'
export const DEFAULT_OG_IMAGE_ALT = "Mike's Exterior Cleaning Services — window cleaning and exterior cleaning in Modesto and the Central Valley"

export function absoluteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}
