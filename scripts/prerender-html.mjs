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
  const pattern = new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/?>`, 'i')
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

function injectRouteHtml(baseHtml, { title, description, keywords, canonical, ogImage, schemas = [], noindex = false }) {
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
    return { seo, site, content, services, articles, wcCities, locations, serviceAreas }
  } finally {
    await server.close()
  }
}

async function collectRoutes(modules, publishedProjects = []) {
  const { seo, site, content, services, articles, wcCities, locations, serviceAreas } = modules
  const { DEFAULT_OG_IMAGE, absoluteUrl } = site

  const routes = []

  routes.push({
    path: '/',
    seo: seo.SEO,
    schemas: seo.getHomePageSchemas(content.FAQS),
    ogImage: DEFAULT_OG_IMAGE,
  })

  const utilityPages = [
    { path: '/service-areas', seo: seo.getServiceAreasPageSeo(), schemas: seo.getServiceAreasPageSchemas() },
    { path: '/instant-quote', seo: seo.getInstantQuotePageSeo(), schemas: seo.getInstantQuotePageSchemas() },
    { path: '/book-online', seo: seo.getBookOnlinePageSeo(), schemas: seo.getBookOnlinePageSchemas() },
    { path: '/projects', seo: seo.getProjectsIndexSeo(), schemas: seo.getProjectsIndexSchemas() },
    { path: '/resources', seo: seo.getBlogIndexSeo(), schemas: [
      seo.getOrganizationSchema(),
      seo.getWebSiteSchema(),
      seo.getBreadcrumbSchema([
        { name: 'Home', url: absoluteUrl('/') },
        { name: 'Resources', url: absoluteUrl('/resources') },
      ]),
    ] },
  ]

  for (const page of utilityPages) {
    routes.push({ path: page.path, seo: page.seo, schemas: page.schemas, ogImage: DEFAULT_OG_IMAGE })
  }

  for (const service of services.SERVICE_PAGES) {
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
    })
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
    })
  }

  for (const page of locations.LOCATION_PAGES) {
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
    routes.push({
      path: `/projects/${project.slug}`,
      seo: projectSeo,
      schemas: seo.getProjectDetailSchemas(publicish),
      ogImage: projectSeo.ogImage || DEFAULT_OG_IMAGE,
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
    })
    writeRouteFile(route.path, html)
  }

  console.log(`Prerendered unique HTML meta for ${routes.length} routes`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
