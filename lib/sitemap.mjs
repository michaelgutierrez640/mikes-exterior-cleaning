export const SITE = 'https://www.mikesexteriorcleaning.com'

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
 * @param {string} [lastmod]
 * @param {Array<{ slug: string, lastmod?: string }>} [publishedProjects]
 */
export function buildSitemapXml(lastmod = new Date().toISOString().split('T')[0], publishedProjects = []) {
  const serviceCityUrls = []
  for (const service of services) {
    for (const city of allCities) {
      serviceCityUrls.push(url(`/services/${service}/${city}`, lastmod, '0.75', 'monthly'))
    }
  }

  const projectEntries = (Array.isArray(publishedProjects) ? publishedProjects : [])
    .filter((p) => p?.slug)
    .map((p) => url(`/projects/${p.slug}`, p.lastmod || lastmod, '0.7', 'monthly'))

  const urls = [
    url('/', lastmod, '1.0', 'weekly'),
    url('/resources', lastmod, '0.8'),
    url('/instant-quote', lastmod, '0.9'),
    url('/book-online', lastmod, '0.9'),
    url('/service-areas', lastmod, '0.85'),
    url('/projects', lastmod, '0.8', 'weekly'),
    ...services.map((s) => url(`/services/${s}`, lastmod, '0.9')),
    ...articles.map((a) => url(`/resources/${a}`, lastmod, '0.75')),
    ...allCities.map((c) => url(`/service-areas/${c}`, lastmod, priorityLocations.includes(c) ? '0.85' : '0.75')),
    ...wcCities.map((c) => url(`/window-cleaning/${c}`, lastmod, '0.8')),
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

export function getSitemapUrlCount(publishedProjectCount = 0) {
  return (
    6 +
    services.length +
    articles.length +
    allCities.length +
    wcCities.length +
    services.length * allCities.length +
    Number(publishedProjectCount || 0)
  )
}
