import { SERVICES } from '../config/content'
import { SERVICE_CITIES } from '../config/serviceAreas'

export function serviceLabel(slug) {
  return SERVICES.find((s) => s.slug === slug)?.title || String(slug || '').replace(/-/g, ' ')
}

export function cityLabel(slug) {
  return SERVICE_CITIES.find((c) => c.slug === slug)?.name || String(slug || '')
}

export function propertyTypeLabel(type) {
  return type === 'commercial' ? 'Commercial' : 'Residential'
}

export function projectHeading(project) {
  if (!project) return 'Completed Project'
  return `${serviceLabel(project.service)} in ${cityLabel(project.city)}`
}

export function projectPath(slug) {
  return `/projects/${encodeURIComponent(slug)}`
}

export function servicePath(serviceSlug) {
  return `/services/${serviceSlug}`
}

export function cityPath(citySlug) {
  return `/service-areas/${citySlug}`
}

export function formatCompletedDate(isoDate) {
  const raw = String(isoDate || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || ''
  const [y, m, d] = raw.split('-').map(Number)
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(
      new Date(y, m - 1, d),
    )
  } catch {
    return raw
  }
}
