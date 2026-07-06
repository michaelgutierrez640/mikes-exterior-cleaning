/** Canonical production URL — update when domain is live. */
export const SITE_URL = 'https://mikesexteriorcleaning.com'

export function absoluteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}
