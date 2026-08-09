export const SITE = 'https://www.mikesexteriorcleaning.com'

/**
 * lastmod for static marketing / SEO routes.
 * Bump this date only when those pages' content meaningfully changes.
 * Do not set this to "today" on every build.
 */
export const STATIC_SITEMAP_LASTMOD = '2026-08-02'

const services = [
  'window-cleaning',
  'pressure-washing',
  'solar-panel-cleaning',
  'gutter-cleaning',
  'residential-window-cleaning',
  'pigeon-guard',
]

const priorityLocations = ['modesto', 'salida', 'riverbank', 'ceres', 'turlock', 'ripon', 'oakdale']
const allCities = [
  'modesto',
  'salida',
  'riverbank',
  'oakdale',
  'ripon',
  'turlock',
  'ceres',
  'manteca',
  'tracy',
  'stockton',
  'patterson',
]
const wcCities = [
  'modesto',
  'salida',
  'riverbank',
  'oakdale',
  'ripon',
  'turlock',
  'ceres',
  'tracy',
  'stockton',
  'manteca',
  'patterson',
]

const articles = [
  'how-often-clean-windows-modesto-ca',
  'hard-water-stains-central-valley-windows',
  'best-time-pressure-wash-driveways-stanislaus-county',
  'solar-panel-cleaning-california-dust-pollen',
  'gutter-cleaning-before-rainy-season-modesto',
  'spring-pollen-window-cleaning-central-valley',
  'commercial-storefront-cleaning-modesto',
  'pressure-washing-vs-soft-wash-central-valley',
  'why-hire-professional-window-cleaners',
  'exterior-cleaning-home-curb-appeal-value',
  'agricultural-dust-exterior-cleaning-turlock',
  'two-story-window-cleaning-safety',
  'gutter-overflow-damage-prevention-ripon',
  'oakdale-ranch-property-exterior-maintenance',
  'ceres-homeowner-exterior-cleaning-checklist',
]

const staticCorePaths = [
  '/',
  '/resources',
  '/instant-quote',
  '/book-online',
  '/review',
  '/service-areas',
  '/projects',
  '/privacy-policy',
  '/terms',
]

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function url(loc, lastmod, priority, changefreq = 'monthly') {
  const href = escapeXml(`${SITE}${loc}`)
  return [
    '  <url>',
    `    <loc>${href}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
  ].join('\n') + '\n  </url>'
}

/**
 * Keep /services/:service/:city in the sitemap only when a published job
 * proves that combination has unique, index-worthy evidence.
 * Routes remain live; we just stop asking Google to crawl the full 66-page matrix.
 */
export function serviceCityEntriesFromProjects(publishedProjects = []) {
  const byPair = new Map()
  for (const p of Array.isArray(publishedProjects) ? publishedProjects : []) {
    const service = String(p?.service || '').trim()
    const city = String(p?.city || '').trim()
    if (!service || !city) continue
    if (!services.includes(service) || !allCities.includes(city)) continue
    const key = `${service}/${city}`
    const lastmod = (p.lastmod || '').slice(0, 10)
    const prev = byPair.get(key)
    if (!prev || (lastmod && lastmod > prev.lastmod)) {
      byPair.set(key, { service, city, lastmod: lastmod || STATIC_SITEMAP_LASTMOD })
    }
  }
  return [...byPair.values()].sort((a, b) =>
    `${a.service}/${a.city}`.localeCompare(`${b.service}/${b.city}`),
  )
}

/**
 * @param {string} [lastmod] static-page lastmod override
 * @param {Array<{ slug: string, lastmod?: string, service?: string, city?: string }>} [publishedProjects]
 */
export function buildSitemapXml(lastmod = STATIC_SITEMAP_LASTMOD, publishedProjects = []) {
  const staticLastmod = lastmod || STATIC_SITEMAP_LASTMOD
  const serviceCityEntries = serviceCityEntriesFromProjects(publishedProjects)

  const projectEntries = (Array.isArray(publishedProjects) ? publishedProjects : [])
    .filter((p) => p?.slug)
    .map((p) => url(`/projects/${p.slug}`, p.lastmod || staticLastmod, '0.7', 'monthly'))

  const serviceCityUrls = serviceCityEntries.map((entry) =>
    url(`/services/${entry.service}/${entry.city}`, entry.lastmod || staticLastmod, '0.7', 'monthly'),
  )

  const urls = [
    url('/', staticLastmod, '1.0', 'weekly'),
    url('/resources', staticLastmod, '0.8'),
    url('/instant-quote', staticLastmod, '0.5'),
    url('/book-online', staticLastmod, '0.9'),
    url('/review', staticLastmod, '0.4'),
    url('/service-areas', staticLastmod, '0.85'),
    url('/projects', staticLastmod, '0.8', 'weekly'),
    url('/privacy-policy', staticLastmod, '0.3', 'yearly'),
    url('/terms', staticLastmod, '0.3', 'yearly'),
    ...services.map((s) => url(`/services/${s}`, staticLastmod, '0.9')),
    ...articles.map((a) => url(`/resources/${a}`, staticLastmod, '0.75')),
    ...allCities.map((c) => url(`/service-areas/${c}`, staticLastmod, priorityLocations.includes(c) ? '0.85' : '0.75')),
    ...wcCities.map((c) => url(`/window-cleaning/${c}`, staticLastmod, c === 'modesto' ? '0.9' : '0.8')),
    ...serviceCityUrls,
    ...projectEntries,
  ]

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}

export function getSitemapUrlCount(publishedProjectCount = 0, serviceCityCount = 0) {
  return (
    staticCorePaths.length +
    services.length +
    articles.length +
    allCities.length +
    wcCities.length +
    Number(serviceCityCount || 0) +
    Number(publishedProjectCount || 0)
  )
}
