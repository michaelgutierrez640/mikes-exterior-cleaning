/**
 * Client-safe project matching helpers (mirrors lib/projectMatch.mjs).
 */

export const SERVICE_MATCH_ALIASES = {
  'window-cleaning': 'window-cleaning',
  window: 'window-cleaning',
  'window cleaning': 'window-cleaning',
  'residential-window-cleaning': 'residential-window-cleaning',
  'residential window cleaning': 'residential-window-cleaning',
  'pressure-washing': 'pressure-washing',
  pressure: 'pressure-washing',
  'pressure washing': 'pressure-washing',
  'solar-panel-cleaning': 'solar-panel-cleaning',
  solar: 'solar-panel-cleaning',
  'solar panel cleaning': 'solar-panel-cleaning',
  'solar panels': 'solar-panel-cleaning',
  'gutter-cleaning': 'gutter-cleaning',
  gutter: 'gutter-cleaning',
  'gutter cleaning': 'gutter-cleaning',
  'pigeon-guard': 'pigeon-guard',
  'pigeon guard': 'pigeon-guard',
  pigeonguard: 'pigeon-guard',
  'bird guard': 'pigeon-guard',
  'bird-guard': 'pigeon-guard',
}

export const CITY_MATCH_ALIASES = {
  modesto: 'modesto',
  salida: 'salida',
  riverbank: 'riverbank',
  oakdale: 'oakdale',
  ripon: 'ripon',
  turlock: 'turlock',
  ceres: 'ceres',
  manteca: 'manteca',
  tracy: 'tracy',
  stockton: 'stockton',
}

export function slugifyMatchValue(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeServiceSlug(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (SERVICE_MATCH_ALIASES[lower]) return SERVICE_MATCH_ALIASES[lower]
  const slug = slugifyMatchValue(raw)
  if (SERVICE_MATCH_ALIASES[slug]) return SERVICE_MATCH_ALIASES[slug]
  const spaced = lower.replace(/-/g, ' ')
  if (SERVICE_MATCH_ALIASES[spaced]) return SERVICE_MATCH_ALIASES[spaced]
  return slug
}

export function normalizeCitySlug(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (CITY_MATCH_ALIASES[lower]) return CITY_MATCH_ALIASES[lower]
  const slug = slugifyMatchValue(raw)
  if (CITY_MATCH_ALIASES[slug]) return CITY_MATCH_ALIASES[slug]
  return slug
}

export function servicesMatch(a, b) {
  const left = normalizeServiceSlug(a)
  const right = normalizeServiceSlug(b)
  return Boolean(left && right && left === right)
}

export function citiesMatch(a, b) {
  const left = normalizeCitySlug(a)
  const right = normalizeCitySlug(b)
  return Boolean(left && right && left === right)
}
