/**
 * Our Work (/#gallery) filters and merging of live Completed Jobs + legacy static photos.
 */

export const OUR_WORK_FILTERS = [
  { id: 'all', label: 'All', services: null },
  {
    id: 'window-cleaning',
    label: 'Window Cleaning',
    services: ['window-cleaning', 'residential-window-cleaning'],
  },
  {
    id: 'solar-panel-cleaning',
    label: 'Solar Panel Cleaning',
    services: ['solar-panel-cleaning'],
  },
  {
    id: 'pressure-washing',
    label: 'Pressure Washing',
    services: ['pressure-washing'],
  },
  {
    id: 'gutter-cleaning',
    label: 'Gutter Cleaning',
    services: ['gutter-cleaning'],
  },
  {
    id: 'pigeon-guard',
    label: 'Pigeon Guard',
    services: ['pigeon-guard'],
  },
]

/** Map legacy static gallery categories onto Our Work filter ids. */
const LEGACY_CATEGORY_TO_FILTER = {
  'window-cleaning': 'window-cleaning',
  'solar-panel-cleaning': 'solar-panel-cleaning',
  'pressure-washing': 'pressure-washing',
  'gutter-cleaning': 'gutter-cleaning',
  'pigeon-guard': 'pigeon-guard',
}

const LABEL_TEXT = {
  before: 'Before',
  after: 'After',
  general: 'General',
}

export function photoLabelText(label) {
  return LABEL_TEXT[label] || 'Photo'
}

/** Normalize for duplicate detection (Blob URL or static path). */
export function normalizeImageUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw)
      return `${u.origin}${u.pathname}`.toLowerCase()
    }
  } catch {
    /* fall through */
  }
  return raw.split('?')[0].toLowerCase()
}

/**
 * @param {object[]} projectItems — from GET /api/projects?view=gallery
 * @param {object[]} legacyItems — curated static gallery
 */
export function mergeOurWorkGallery(projectItems = [], legacyItems = []) {
  const used = new Set()
  const merged = []

  for (const item of projectItems) {
    const key = normalizeImageUrl(item.url)
    if (!key || used.has(key)) continue
    used.add(key)
    merged.push({
      kind: 'project',
      id: `project:${item.projectSlug}:${key}`,
      url: item.url,
      variants: item.variants || null,
      blurDataUrl: item.blurDataUrl || null,
      width: item.width,
      height: item.height,
      label: item.label || 'general',
      alt: item.alt || '',
      projectSlug: item.projectSlug,
      service: item.service,
      city: item.city,
      completedAt: item.completedAt,
      publishedAt: item.publishedAt,
      filterIds: serviceToFilterIds(item.service),
    })
  }

  for (const item of legacyItems) {
    if (item.type && item.type !== 'image') continue
    const src = item.src || item.url
    const key = normalizeImageUrl(src)
    if (!key || used.has(key)) continue
    used.add(key)
    const filterId = LEGACY_CATEGORY_TO_FILTER[item.category] || null
    merged.push({
      kind: 'legacy',
      id: `legacy:${key}`,
      url: src,
      src,
      webp: item.webp,
      srcSet: item.srcSet,
      width: item.width,
      height: item.height,
      label: 'general',
      alt: item.alt || '',
      projectSlug: null,
      service: item.category || null,
      city: null,
      completedAt: null,
      publishedAt: null,
      categoryTitle: item.categoryTitle || null,
      filterIds: filterId ? [filterId] : [],
    })
  }

  return merged
}

function serviceToFilterIds(service) {
  const ids = []
  for (const filter of OUR_WORK_FILTERS) {
    if (!filter.services) continue
    if (filter.services.includes(service)) ids.push(filter.id)
  }
  return ids
}

export function filterOurWorkItems(items, filterId) {
  if (!filterId || filterId === 'all') return items
  return items.filter((item) => (item.filterIds || []).includes(filterId))
}
