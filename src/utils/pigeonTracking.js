/**
 * Pure helpers for Pigeon Guard conversion tracking params.
 * No PII — safe for GA4 / Meta / first-party analytics.
 */

export const PIGEON_SERVICE = 'pigeon_guard'
export const PIGEON_PATH = '/services/pigeon-guard'

/** Canonical problem labels → non-PII tracking keys (never free-text notes). */
export const PIGEON_PROBLEM_TRACKING_KEYS = {
  'Pigeons currently nesting': 'nesting',
  'Droppings/debris': 'droppings',
  'Noise under panels': 'noise',
  'Preventative installation / no current issue': 'preventative',
  'Not sure': 'not_sure',
}

/**
 * Normalize selected problems for analytics. Unknown values are dropped.
 * @returns {string|undefined} comma-separated keys, e.g. "droppings,nesting"
 */
export function normalizePigeonProblemsForTracking(problems) {
  if (!Array.isArray(problems) || !problems.length) return undefined
  const keys = [
    ...new Set(
      problems
        .map((p) => PIGEON_PROBLEM_TRACKING_KEYS[String(p || '').trim()])
        .filter(Boolean),
    ),
  ].sort()
  return keys.length ? keys.join(',') : undefined
}

/** City for analytics only — reject values that look like PII/contact data. */
export function normalizeCityForTracking(city) {
  const s = String(city || '').trim().slice(0, 80)
  if (!s) return undefined
  if (/[@]|https?:|www\./i.test(s)) return undefined
  if (/\d{3,}/.test(s)) return undefined
  if (!/^[A-Za-z][A-Za-z\s.'’-]*$/.test(s)) return undefined
  return s
}

/**
 * Build non-sensitive pigeon conversion params.
 * @param {{ city?: string, problems?: string[], sourceHint?: string, utm?: Record<string, string|null|undefined> }} [input]
 */
export function buildPigeonTrackingParams({ city, problems, sourceHint, utm = {} } = {}) {
  const params = {
    service: PIGEON_SERVICE,
    page_path: PIGEON_PATH,
  }
  if (utm.utmSource || utm.utm_source) params.utm_source = String(utm.utmSource || utm.utm_source).slice(0, 100)
  if (utm.utmMedium || utm.utm_medium) params.utm_medium = String(utm.utmMedium || utm.utm_medium).slice(0, 100)
  if (utm.utmCampaign || utm.utm_campaign) {
    params.utm_campaign = String(utm.utmCampaign || utm.utm_campaign).slice(0, 160)
  }
  if (utm.utmTerm || utm.utm_term) params.utm_term = String(utm.utmTerm || utm.utm_term).slice(0, 160)
  if (utm.utmContent || utm.utm_content) params.utm_content = String(utm.utmContent || utm.utm_content).slice(0, 160)
  if (sourceHint) params.source_hint = String(sourceHint).slice(0, 100)
  const safeCity = normalizeCityForTracking(city)
  if (safeCity) params.city = safeCity
  const problemKeys = normalizePigeonProblemsForTracking(problems)
  if (problemKeys) params.problems = problemKeys
  return params
}
