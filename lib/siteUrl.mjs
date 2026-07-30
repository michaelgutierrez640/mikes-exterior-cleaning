/**
 * Canonical site URL helpers for server-side code (APIs / lib).
 * Prefer SITE_URL env when set; default to the live production domain.
 */

export function getSiteUrl() {
  const fromEnv = String(process.env.SITE_URL || process.env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '')
  if (/^https:\/\//i.test(fromEnv)) return fromEnv
  return 'https://www.mikesexteriorcleaning.com'
}

export function absoluteSiteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${getSiteUrl()}${normalized}`
}

export function projectCanonicalUrl(slug) {
  const clean = String(slug || '')
    .trim()
    .replace(/^\/+/, '')
  if (!clean) return ''
  return absoluteSiteUrl(`/projects/${encodeURIComponent(clean)}`)
}
