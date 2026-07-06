import windowCleaning from './window-cleaning'
import pressureWashing from './pressure-washing'
import solarPanelCleaning from './solar-panel-cleaning'
import gutterCleaning from './gutter-cleaning'
import commercialWindowCleaning from './commercial-window-cleaning'

export const SERVICE_PAGES = [
  windowCleaning,
  pressureWashing,
  solarPanelCleaning,
  gutterCleaning,
  commercialWindowCleaning,
]

export function getServicePageBySlug(slug) {
  return SERVICE_PAGES.find((s) => s.slug === slug) ?? null
}

export const SERVICE_PAGE_SLUGS = SERVICE_PAGES.map((s) => s.slug)
