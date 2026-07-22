/**
 * Shared rules for what first-party analytics may persist to Production Redis.
 *
 * Preview identification:
 * - Request Host / X-Forwarded-Host ends with `.vercel.app` (Vercel Preview / deployment URLs)
 * - OR hostname is localhost / 127.0.0.1 (local dev against shared Redis)
 *
 * Production hosts (always allowed when not admin):
 * - www.mikesexteriorcleaning.com
 * - mikesexteriorcleaning.com
 *
 * Admin identification:
 * - Event `path` starts with `/admin` (page views and any admin-originated actions)
 *
 * Legitimate public Production visitors on the canonical domain are never excluded by host rules.
 */

export const PRODUCTION_HOSTS = new Set(['www.mikesexteriorcleaning.com', 'mikesexteriorcleaning.com'])

/**
 * @param {string} hostHeader
 * @returns {string}
 */
export function normalizeHost(hostHeader = '') {
  return String(hostHeader || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
}

/**
 * @param {string} host
 * @returns {boolean}
 */
export function isNonProductionAnalyticsHost(host) {
  const h = normalizeHost(host)
  if (!h) return false
  if (PRODUCTION_HOSTS.has(h)) return false
  if (h.endsWith('.vercel.app')) return true
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) return true
  return false
}

/**
 * @param {string|null|undefined} path
 * @returns {boolean}
 */
export function isAdminAnalyticsPath(path) {
  if (!path) return false
  const p = String(path).split('?')[0]
  return p === '/admin' || p.startsWith('/admin/')
}

/**
 * @param {{ host?: string, path?: string|null }} input
 * @returns {{ persist: boolean, reason: string|null }}
 */
export function shouldPersistAnalyticsEvent({ host, path }) {
  if (isNonProductionAnalyticsHost(host)) {
    return { persist: false, reason: 'non_production_host' }
  }
  if (isAdminAnalyticsPath(path)) {
    return { persist: false, reason: 'admin_path' }
  }
  return { persist: true, reason: null }
}

/**
 * Extract host from an IncomingMessage-like request.
 * @param {import('http').IncomingMessage} req
 */
export function getRequestHost(req) {
  const forwarded = req?.headers?.['x-forwarded-host']
  const host = req?.headers?.host
  return normalizeHost(typeof forwarded === 'string' ? forwarded : typeof host === 'string' ? host : '')
}
