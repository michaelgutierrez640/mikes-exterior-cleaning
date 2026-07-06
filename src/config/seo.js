import { BUSINESS } from './business'
import { SITE_URL, absoluteUrl } from './site'
import { SERVICE_CITIES } from './serviceAreas'

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
