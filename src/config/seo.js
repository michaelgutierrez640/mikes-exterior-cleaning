import { BUSINESS } from './business'
import { SITE_URL, absoluteUrl, DEFAULT_OG_IMAGE } from './site'
import { SERVICE_CITIES } from './serviceAreas'

export { DEFAULT_OG_IMAGE }

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: BUSINESS.name,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    email: BUSINESS.email,
    telephone: BUSINESS.phone,
    description: BUSINESS.description,
    areaServed: 'Central Valley, California',
  }
}

export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: BUSINESS.name,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-US',
  }
}

export function getHomePageSchemas(faqs = []) {
  const schemas = [getOrganizationSchema(), getWebSiteSchema(), getLocalBusinessSchema()]
  if (faqs.length) schemas.push(getFaqPageSchema(faqs))
  return schemas
}

export const SEO = {
  title: "Mike's Exterior Cleaning Services | Window Cleaning Modesto & Central Valley",
  description:
    'Premium window cleaning, solar panel cleaning, gutter cleaning, and pressure washing in Modesto, Manteca, Riverbank, Turlock, Salida & Ripon. 5.0 rating with 44 Google reviews. Free estimates.',
  keywords: [
    'Window Cleaning Modesto',
    'Pressure Washing Modesto',
    'Solar Panel Cleaning Modesto',
    'Gutter Cleaning Modesto',
    'Commercial Window Cleaning Modesto',
    'exterior cleaning Central Valley',
    "Mike's Exterior Cleaning Services",
  ].join(', '),
  canonical: SITE_URL,
}

export function getLocalBusinessSchema(overrides = {}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#localbusiness`,
    name: BUSINESS.name,
    url: SITE_URL,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    description: BUSINESS.description,
    parentOrganization: { '@id': `${SITE_URL}/#organization` },
    image: DEFAULT_OG_IMAGE,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Modesto',
      addressRegion: 'CA',
      addressCountry: 'US',
    },
    areaServed: SERVICE_CITIES.map((city) => ({
      '@type': 'City',
      name: `${city.name}, ${city.state}`,
      containedInPlace: { '@type': 'State', name: 'California' },
    })),
    priceRange: '$$',
    serviceType: [
      'Window Cleaning',
      'Commercial Window Cleaning',
      'Solar Panel Cleaning',
      'Gutter Cleaning',
      'Pressure Washing',
    ],
    ...overrides,
  }

  if (BUSINESS.googleReviewRating != null && BUSINESS.googleReviews != null) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(BUSINESS.googleReviewRating),
      reviewCount: String(BUSINESS.googleReviews),
      bestRating: '5',
    }
  }

  return schema
}

export function getServiceSchema({ name, description, slug, areaServed, url }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    provider: { '@id': `${SITE_URL}/#localbusiness` },
    areaServed:
      areaServed ??
      SERVICE_CITIES.map((city) => ({
        '@type': 'City',
        name: `${city.name}, ${city.state}`,
      })),
    url: url ?? absoluteUrl(`/services/${slug}`),
    serviceType: name.includes('Window') ? 'Window Cleaning' : name,
  }
}

export function getFaqPageSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  }
}

export function getBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function getServiceAreasPageSeo() {
  return {
    title: 'Service Areas | Exterior Cleaning Modesto & Central Valley | Mike\'s Exterior',
    description:
      'Mike\'s Exterior Cleaning Services serves Modesto, Salida, Riverbank, Oakdale, Ripon, Turlock, Ceres, Manteca, Tracy, and Stockton with window cleaning, pressure washing, solar panel cleaning, and gutter cleaning. Free estimates.',
    keywords:
      'exterior cleaning service areas, window cleaning Modesto, pressure washing Central Valley, gutter cleaning Stanislaus County, solar panel cleaning San Joaquin County',
    canonical: absoluteUrl('/service-areas'),
  }
}

export function getCityPageSeo(city) {
  return {
    title: `Exterior Cleaning ${city.name}, CA | Windows, Gutters & Pressure Washing`,
    description: `Professional exterior cleaning in ${city.name}, ${city.state} — window cleaning, pressure washing, solar panels, and gutters. ${BUSINESS.name}. Free estimates. Call ${BUSINESS.phone}.`,
    keywords: `exterior cleaning ${city.name}, window cleaning ${city.name}, pressure washing ${city.name}, gutter cleaning ${city.name}`,
    canonical: absoluteUrl(`/service-areas/${city.slug}`),
  }
}

/** Combined JSON-LD for service pages — LocalBusiness, Service, FAQPage, BreadcrumbList. */
export function getServicePageSchemas({ serviceName, description, slug, faqs }) {
  const serviceUrl = absoluteUrl(`/services/${slug}`)

  return [
    getOrganizationSchema(),
    getLocalBusinessSchema(),
    getServiceSchema({ name: serviceName, description, slug }),
    getFaqPageSchema(faqs),
    getBreadcrumbSchema([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Services', url: `${absoluteUrl('/')}#services` },
      { name: serviceName, url: serviceUrl },
    ]),
  ]
}

/** JSON-LD for window cleaning city landing pages. */
export function getWindowCleaningCityPageSchemas({ cityName, state, description, citySlug, faqs }) {
  const pageUrl = absoluteUrl(`/window-cleaning/${citySlug}`)
  const serviceName = `Window Cleaning ${cityName}`

  return [
    getLocalBusinessSchema({
      areaServed: [{ '@type': 'City', name: `${cityName}, ${state}` }],
    }),
    getServiceSchema({
      name: serviceName,
      description,
      slug: citySlug,
      url: pageUrl,
      areaServed: [{ '@type': 'City', name: `${cityName}, ${state}` }],
    }),
    getFaqPageSchema(faqs),
    getBreadcrumbSchema([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Window Cleaning', url: absoluteUrl('/services/window-cleaning') },
      { name: `${cityName}, ${state}`, url: pageUrl },
    ]),
  ]
}

/** JSON-LD for full location hub pages (/service-areas/:city). */
export function getLocationPageSchemas({ cityName, state, description, citySlug, faqs }) {
  const pageUrl = absoluteUrl(`/service-areas/${citySlug}`)

  return [
    getOrganizationSchema(),
    getLocalBusinessSchema({
      areaServed: [{ '@type': 'City', name: `${cityName}, ${state}` }],
    }),
    getServiceSchema({
      name: `Exterior Cleaning ${cityName}`,
      description,
      slug: citySlug,
      url: pageUrl,
      areaServed: [{ '@type': 'City', name: `${cityName}, ${state}` }],
    }),
    getFaqPageSchema(faqs),
    getBreadcrumbSchema([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Service Areas', url: absoluteUrl('/service-areas') },
      { name: `${cityName}, ${state}`, url: pageUrl },
    ]),
  ]
}

export function getBlogIndexSeo() {
  return {
    title: 'Exterior Cleaning Resources | Tips for Modesto & Central Valley | Mike\'s Exterior',
    description:
      'Expert guides on window cleaning, pressure washing, gutter care, and solar panel maintenance for Modesto, Stanislaus County, and the Central Valley. Free advice from local pros.',
    keywords: 'exterior cleaning tips, window cleaning guide Modesto, pressure washing advice Central Valley, gutter cleaning resources',
    canonical: absoluteUrl('/resources'),
  }
}

export function getBlogArticleSchemas(article) {
  const url = absoluteUrl(`/resources/${article.slug}`)
  return [
    getOrganizationSchema(),
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.meta.description,
      url,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt ?? article.publishedAt,
      author: { '@type': 'Organization', name: BUSINESS.name },
      publisher: {
        '@type': 'Organization',
        name: BUSINESS.name,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
      },
      image: DEFAULT_OG_IMAGE,
      mainEntityOfPage: url,
    },
    getBreadcrumbSchema([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Resources', url: absoluteUrl('/resources') },
      { name: article.title, url },
    ]),
  ]
}
