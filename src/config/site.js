/** Canonical production URL — update when domain is live. */
export const SITE_URL = 'https://mikesexteriorcleaning.com'

/** Default Open Graph / social share image */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/before-after/img-0947-after.jpg`

export function absoluteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}
