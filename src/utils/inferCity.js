import { SERVICE_CITY_NAMES } from '../config/serviceAreas'

/**
 * Best-effort city inference from free-text address and/or URL path.
 * Never invents a city — returns null when unknown.
 */
export function inferCityFromText(...parts) {
  const hay = parts
    .filter(Boolean)
    .map((p) => String(p))
    .join(' ')
    .toLowerCase()

  if (!hay) return null

  const sorted = [...SERVICE_CITY_NAMES].sort((a, b) => b.length - a.length)
  for (const name of sorted) {
    const needle = name.toLowerCase()
    // Word-ish match so "stock" alone does not match Stockton
    const re = new RegExp(`(?:^|[^a-z])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z]|$)`, 'i')
    if (re.test(hay)) return name
  }

  return null
}
