#!/usr/bin/env node
/**
 * Injects route-specific title, meta, canonical, and JSON-LD into static HTML files
 * so crawlers receive unique page metadata without waiting for client-side JS.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function upsertMetaTag(html, attr, key, content) {
  if (!content) return html
  const escaped = escapeHtml(content)
  // Match single-line or multi-line <meta ...> (index.html uses wrapped attributes).
  const pattern = new RegExp(
    `<meta\\s[^>]*?${attr}\\s*=\\s*["']${key}["'][^>]*?/?>`,
    'is',
  )
  const tag = `<meta ${attr}="${key}" content="${escaped}" />`
  if (pattern.test(html)) return html.replace(pattern, tag)
  return html.replace('</head>', `    ${tag}\n  </head>`)
}

function upsertLink(html, rel, href) {
  if (!href) return html
  const escaped = escapeHtml(href)
  const pattern = new RegExp(`<link rel="${rel}" href="[^"]*"\\s*/?>`, 'i')
  const tag = `<link rel="${rel}" href="${escaped}" />`
  if (pattern.test(html)) return html.replace(pattern, tag)
  return html.replace('</head>', `    ${tag}\n  </head>`)
}

function injectRouteHtml(baseHtml, { title, description, keywords, canonical, ogImage, schemas = [], noindex = false, h1 = '', crawlLinks = [] }) {
  let html = baseHtml
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`)
  html = upsertMetaTag(html, 'name', 'description', description)
  html = upsertMetaTag(html, 'name', 'keywords', keywords)
  html = upsertMetaTag(html, 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
  html = upsertMetaTag(html, 'property', 'og:title', title)
  html = upsertMetaTag(html, 'property', 'og:description', description)
  html = upsertMetaTag(html, 'property', 'og:image', ogImage)
  html = upsertMetaTag(html, 'name', 'twitter:title', title)
  html = upsertMetaTag(html, 'name', 'twitter:description', description)
  html = upsertMetaTag(html, 'name', 'twitter:image', ogImage)
  html = upsertLink(html, 'canonical', canonical)
  html = upsertMetaTag(html, 'property', 'og:url', canonical)

  html = html.replace(/\s*<script type="application\/ld\+json" data-prerender="true">[\s\S]*?<\/script>/gi, '')
  if (schemas.length) {
    const blocks = schemas
      .map((schema) => `    <script type="application/ld+json" data-prerender="true">${JSON.stringify(schema)}</script>`)
      .join('\n')
    html = html.replace('</head>', `${blocks}\n  </head>`)
  }

  // Crawlable shell inside #root (replaced by React on hydrate). Helps non-JS / first-pass crawlers.
  if (h1 || crawlLinks.length) {
    const linksHtml = crawlLinks
      .map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
      .join(' · ')
    const shell = [
      '<main data-prerender-shell>',
      h1 ? `<h1>${escapeHtml(h1)}</h1>` : '',
      description ? `<p>${escapeHtml(description)}</p>` : '',
      linksHtml ? `<nav aria-label="Related pages">${linksHtml}</nav>` : '',
      '</main>',
    ]
      .filter(Boolean)
      .join('')
    html = html.replace(/<div id="root"><\/div>/i, `<div id="root">${shell}</div>`)
  }

  return html
}

function writeRouteFile(routePath, html) {
  const outFile =
    routePath === '/'
      ? join(dist, 'index.html')
      : join(dist, routePath.replace(/^\//, ''), 'index.html')
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, html)
}

async function loadModules() {
  const server = await createServer({
    root,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  })

  try {
    const seo = await server.ssrLoadModule('/src/config/seo.js')
    const site = await server.ssrLoadModule('/src/config/site.js')
    const content = await server.ssrLoadModule('/src/config/content.js')
    const services = await server.ssrLoadModule('/src/content/services/index.js')
    const articles = await server.ssrLoadModule('/src/content/blog/articles.js')
    const wcCities = await server.ssrLoadModule('/src/content/cities/window-cleaning/index.js')
    const locations = await server.ssrLoadModule('/src/content/cities/location/index.js')
    const serviceAreas = await server.ssrLoadModule('/src/config/serviceAreas.js')
    const serviceCityContent = await server.ssrLoadModule('/src/utils/serviceCityContent.js')
    return { seo, site, content, services, articles, wcCities, locations, serviceAreas, serviceCityContent }
  } finally {
    await server.close()
  }
}

async function collectRoutes(modules, publishedProjects = []) {
  const { seo, site, content, services, articles, wcCities, locations, serviceAreas, serviceCityContent } =
    modules
  const { DEFAULT_OG_IMAGE, absoluteUrl } = site

  const routes = []

  routes.push({
    path: '/',
    seo: seo.SEO,
    schemas: seo.getHomePageSchemas(content.FAQS),
    ogImage: DEFAULT_OG_IMAGE,
    h1: "Mike's Exterior Cleaning Services",
    crawlLinks: [
      { href: '/service-areas/modesto', label: 'Exterior cleaning in Modesto' },
      { href: '/window-cleaning/modesto', label: 'Window cleaning in Modesto' },
      { href: '/services/window-cleaning', label: 'Window Cleaning' },
      { href: '/#gallery', label: 'Our Work' },
    ],
  })

  const utilityPages = [
    {
      path: '/service-areas',
      seo: seo.getServiceAreasPageSeo(),
      schemas: seo.getServiceAreasPageSchemas(),
      h1: 'Service Areas — Modesto & Central Valley',
      crawlLinks: [
        { href: '/service-areas/modesto', label: 'Modesto' },
        { href: '/window-cleaning/modesto', label: 'Window cleaning in Modesto' },
        { href: '/services/window-cleaning', label: 'Window Cleaning' },
        { href: '/#gallery', label: 'Our Work' },
      ],
    },
    {
      path: '/instant-quote',
      seo: seo.getInstantQuotePageSeo(),
      schemas: seo.getInstantQuotePageSchemas(),
      h1: 'Instant Quote',
      crawlLinks: [
        { href: '/book-online', label: 'Book Online' },
        { href: '/services/window-cleaning', label: 'Window Cleaning' },
        { href: '/#gallery', label: 'Our Work' },
      ],
    },
    {
      path: '/book-online',
      seo: seo.getBookOnlinePageSeo(),
      schemas: seo.getBookOnlinePageSchemas(),
      h1: 'Book Online',
      crawlLinks: [
        { href: '/instant-quote', label: 'Instant Quote' },
        { href: '/service-areas', label: 'Service Areas' },
        { href: '/#gallery', label: 'Our Work' },
      ],
    },
    {
      path: '/projects',
      seo: seo.getProjectsIndexSeo(),
      schemas: seo.getProjectsIndexSchemas(),
      h1: 'Completed Projects',
      crawlLinks: [
        { href: '/#gallery', label: 'Our Work gallery' },
        { href: '/service-areas/modesto', label: 'Modesto service area' },
        { href: '/services/window-cleaning', label: 'Window Cleaning' },
      ],
    },
    {
      path: '/privacy-policy',
      seo: seo.getPrivacyPolicyPageSeo(),
      schemas: seo.getPrivacyPolicyPageSchemas(),
      h1: 'Privacy Policy',
      crawlLinks: [{ href: '/', label: 'Home' }],
    },
    {
      path: '/resources',
      seo: seo.getBlogIndexSeo(),
      schemas: [
        seo.getOrganizationSchema(),
        seo.getWebSiteSchema(),
        seo.getBreadcrumbSchema([
          { name: 'Home', url: absoluteUrl('/') },
          { name: 'Resources', url: absoluteUrl('/resources') },
        ]),
      ],
      h1: 'Exterior Cleaning Resources',
      crawlLinks: [
        { href: '/resources/how-often-clean-windows-modesto-ca', label: 'How often to clean windows in Modesto' },
        { href: '/services/window-cleaning', label: 'Window Cleaning' },
        { href: '/#gallery', label: 'Our Work' },
      ],
    },
  ]

  for (const page of utilityPages) {
    routes.push({
      path: page.path,
      seo: page.seo,
      schemas: page.schemas,
      ogImage: DEFAULT_OG_IMAGE,
      h1: page.h1,
      crawlLinks: page.crawlLinks || [],
    })
  }

  for (const service of services.SERVICE_PAGES) {
    const isWindowCleaning = service.slug === 'window-cleaning'
    routes.push({
      path: `/services/${service.slug}`,
      seo: {
        title: service.meta.title,
        description: service.meta.description,
        keywords: service.meta.keywords,
        canonical: absoluteUrl(`/services/${service.slug}`),
      },
      schemas: seo.getServicePageSchemas({
        serviceName: service.serviceName,
        description: service.meta.description,
        slug: service.slug,
        faqs: service.faqs,
      }),
      ogImage: service.hero?.image ? absoluteUrl(service.hero.image) : DEFAULT_OG_IMAGE,
      h1: service.hero?.h1 || service.serviceName,
      crawlLinks: isWindowCleaning
        ? [
            { href: '/window-cleaning/modesto', label: 'Window cleaning in Modesto' },
            { href: '/service-areas/modesto', label: 'Exterior cleaning in Modesto' },
            { href: '/#gallery', label: 'Our Work' },
          ]
        : [
            { href: '/service-areas/modesto', label: 'Exterior cleaning in Modesto' },
            { href: '/#gallery', label: 'Our Work' },
          ],
    })

    for (const city of serviceAreas.SERVICE_CITIES) {
      const path = `/services/${service.slug}/${city.slug}`
      const local = serviceCityContent.buildServiceCityContent(service.slug, city, service)
      const crawlLinks = [
        { href: `/services/${service.slug}`, label: `${service.serviceName} service` },
        { href: `/service-areas/${city.slug}`, label: `Exterior cleaning in ${city.name}` },
        { href: '/#gallery', label: 'Our Work' },
        { href: '/instant-quote', label: 'Instant Quote' },
      ]
      if (service.slug === 'window-cleaning' || service.slug === 'residential-window-cleaning') {
        crawlLinks.splice(1, 0, {
          href: `/window-cleaning/${city.slug}`,
          label: `Window cleaning in ${city.name}`,
        })
      }
      routes.push({
        path,
        seo: {
          title: local.title,
          description: local.description,
          keywords: Array.isArray(local.keywords) ? local.keywords.join(', ') : local.keywords,
          canonical: absoluteUrl(path),
        },
        schemas: [
          seo.getOrganizationSchema(),
          seo.getLocalBusinessSchema({
            areaServed: [{ '@type': 'City', name: `${city.name}, ${city.state}` }],
          }),
          seo.getBreadcrumbSchema([
            { name: 'Home', url: absoluteUrl('/') },
            { name: service.serviceName, url: absoluteUrl(`/services/${service.slug}`) },
            { name: `${service.serviceName} in ${city.name}`, url: absoluteUrl(path) },
          ]),
          seo.getFaqPageSchema(local.faqs),
        ],
        ogImage: service.hero?.image ? absoluteUrl(service.hero.image) : DEFAULT_OG_IMAGE,
        h1: local.h1,
        crawlLinks,
      })
    }
  }

  for (const city of wcCities.WINDOW_CLEANING_CITY_PAGES) {
    routes.push({
      path: `/window-cleaning/${city.citySlug}`,
      seo: {
        title: city.meta.title,
        description: city.meta.description,
        keywords: city.meta.keywords,
        canonical: absoluteUrl(`/window-cleaning/${city.citySlug}`),
      },
      schemas: seo.getWindowCleaningCityPageSchemas({
        cityName: city.cityName,
        state: city.state,
        description: city.meta.description,
        citySlug: city.citySlug,
        faqs: city.faqs,
      }),
      ogImage: DEFAULT_OG_IMAGE,
      h1: city.hero?.h1 || `Window Cleaning in ${city.cityName}, CA`,
      crawlLinks: [
        { href: '/services/window-cleaning', label: 'Window Cleaning service' },
        { href: `/service-areas/${city.citySlug}`, label: `Exterior cleaning in ${city.cityName}` },
        { href: '/#gallery', label: 'Our Work' },
        { href: '/instant-quote', label: 'Instant Quote' },
      ],
    })
  }

  for (const page of locations.LOCATION_PAGES) {
    const hasWc = wcCities.WINDOW_CLEANING_CITY_SLUGS.includes(page.citySlug)
    routes.push({
      path: `/service-areas/${page.citySlug}`,
      seo: {
        title: page.meta.title,
        description: page.meta.description,
        keywords: page.meta.keywords,
        canonical: absoluteUrl(`/service-areas/${page.citySlug}`),
      },
      schemas: seo.getLocationPageSchemas({
        cityName: page.cityName,
        state: page.state,
        description: page.meta.description,
        citySlug: page.citySlug,
        faqs: page.faqs,
      }),
      ogImage: DEFAULT_OG_IMAGE,
      h1: page.hero?.h1 || `Exterior Cleaning in ${page.cityName}, CA`,
      crawlLinks: [
        ...(hasWc
          ? [{ href: `/window-cleaning/${page.citySlug}`, label: `Window cleaning in ${page.cityName}` }]
          : []),
        { href: '/services/window-cleaning', label: 'Window Cleaning' },
        { href: '/service-areas', label: 'All service areas' },
        { href: '/#gallery', label: 'Our Work' },
      ],
    })
  }

  const fullSlugs = new Set(locations.LOCATION_PAGES.map((p) => p.citySlug))
  for (const city of serviceAreas.SERVICE_CITIES) {
    if (fullSlugs.has(city.slug)) continue
    const pageSeo = seo.getCityPageSeo(city)
    const thinFaqs = seo.getThinCityFaqs(city)
    routes.push({
      path: `/service-areas/${city.slug}`,
      seo: pageSeo,
      schemas: [
        seo.getLocalBusinessSchema({ areaServed: [{ '@type': 'City', name: `${city.name}, ${city.state}` }] }),
        seo.getBreadcrumbSchema([
          { name: 'Home', url: absoluteUrl('/') },
          { name: 'Service Areas', url: absoluteUrl('/service-areas') },
          { name: `${city.name}, ${city.state}`, url: pageSeo.canonical },
        ]),
        seo.getFaqPageSchema(thinFaqs),
      ],
      ogImage: DEFAULT_OG_IMAGE,
    })
  }

  for (const article of articles.default) {
    const crawlLinks = [
      { href: '/resources', label: 'All resources' },
      { href: '/#gallery', label: 'Our Work' },
      { href: '/instant-quote', label: 'Instant Quote' },
    ]
    if (article.relatedServiceSlug) {
      crawlLinks.unshift({
        href: `/services/${article.relatedServiceSlug}`,
        label: 'Related service',
      })
    }
    if (article.relatedCitySlug) {
      crawlLinks.splice(1, 0, {
        href: `/service-areas/${article.relatedCitySlug}`,
        label: 'Related service area',
      })
    }
    routes.push({
      path: `/resources/${article.slug}`,
      seo: {
        title: article.meta.title,
        description: article.meta.description,
        keywords: article.meta.keywords,
        canonical: absoluteUrl(`/resources/${article.slug}`),
      },
      schemas: seo.getBlogArticleSchemas(article),
      ogImage: DEFAULT_OG_IMAGE,
      h1: article.title || article.meta.title,
      crawlLinks,
    })
  }

  for (const project of publishedProjects) {
    if (!project?.slug) continue
    // Minimal public shape for SEO helpers
    const publicish = {
      slug: project.slug,
      service: project.service,
      city: project.city,
      propertyType: project.propertyType || 'residential',
      completedAt: project.completedAt || '',
      notes: '',
      photos: project.coverImage ? [{ url: project.coverImage, label: 'general' }] : [],
    }
    const projectSeo = seo.getProjectDetailSeo(publicish)
    const serviceName = String(project.service || 'exterior cleaning').replace(/-/g, ' ')
    const cityName = String(project.city || '').replace(/-/g, ' ')
    routes.push({
      path: `/projects/${project.slug}`,
      seo: projectSeo,
      schemas: seo.getProjectDetailSchemas(publicish),
      ogImage: projectSeo.ogImage || DEFAULT_OG_IMAGE,
      h1: projectSeo.title?.split('|')[0]?.trim() || `${serviceName} in ${cityName}`,
      crawlLinks: [
        { href: '/projects', label: 'All projects' },
        ...(project.service ? [{ href: `/services/${project.service}`, label: 'Related service' }] : []),
        ...(project.city ? [{ href: `/service-areas/${project.city}`, label: 'Service area' }] : []),
        { href: '/#gallery', label: 'Our Work' },
      ],
    })
  }

  return routes
}

async function main() {
  const baseHtml = readFileSync(join(dist, 'index.html'), 'utf8')
  const modules = await loadModules()

  let publishedProjects = []
  try {
    const { listPublishedProjectSitemapEntries } = await import('../lib/projectsPublic.mjs')
    publishedProjects = await listPublishedProjectSitemapEntries()
  } catch (err) {
    console.warn('Prerender: published projects skipped:', err?.message || err)
  }

  const routes = await collectRoutes(modules, publishedProjects)

  for (const route of routes) {
    const html = injectRouteHtml(baseHtml, {
      title: route.seo.title,
      description: route.seo.description,
      keywords: route.seo.keywords,
      canonical: route.seo.canonical,
      ogImage: route.ogImage,
      schemas: route.schemas,
      noindex: route.noindex,
      h1: route.h1,
      crawlLinks: route.crawlLinks || [],
    })
    writeRouteFile(route.path, html)
  }

  console.log(`Prerendered unique HTML meta for ${routes.length} routes`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
