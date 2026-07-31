/** Canonical production URL — update when domain is live. */
export const SITE_URL = 'https://www.mikesexteriorcleaning.com'

/** Default Open Graph / social share image (non-homepage routes) */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/before-after/img-0947-after.jpg`

/**
 * Homepage social share card — official logo on navy, 1200×630.
 * Cache-busted filename so Facebook / iMessage fetch the new asset.
 */
export const HOME_OG_IMAGE = `${SITE_URL}/images/brand/mikes-exterior-og-share-v20260730.png`
export const HOME_OG_IMAGE_WIDTH = 1200
export const HOME_OG_IMAGE_HEIGHT = 630
export const HOME_OG_IMAGE_ALT = "Mike's Exterior Cleaning Services logo"

export function absoluteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}
