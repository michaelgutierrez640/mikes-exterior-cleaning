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

export function getHomePageSchemas(faqs = [], reviewSummary = null) {
  const schemas = [
    getOrganizationSchema(),
    getWebSiteSchema(),
    getLocalBusinessSchema({}, reviewSummary),
  ]
  if (faqs.length) schemas.push(getFaqPageSchema(faqs))
  if (reviewSummary?.reviews?.length) {
    schemas.push(...getReviewSchemas(reviewSummary.reviews, reviewSummary.businessName))
  }
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
    'Residential Window Cleaning Modesto',
    'exterior cleaning Central Valley',
    "Mike's Exterior Cleaning Services",
  ].join(', '),
  canonical: SITE_URL,
}

export function getLocalBusinessSchema(overrides = {}, reviewSummary = null) {
  const openingHoursSpecification = BUSINESS.hours.flatMap((row) => {
    if (row.time.toLowerCase().includes('appointment')) return []
    const [openRaw, closeRaw] = row.time.split(' – ')
    const to24 = (t) => {
      const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
      if (!match) return t
      let hour = parseInt(match[1], 10)
      const mins = match[2]
      const meridiem = match[3].toUpperCase()
      if (meridiem === 'PM' && hour !== 12) hour += 12
      if (meridiem === 'AM' && hour === 12) hour = 0
      return `${String(hour).padStart(2, '0')}:${mins}`
    }
    const opens = to24(openRaw)
    const closes = to24(closeRaw)
    const days = row.days.includes('Monday') && row.days.includes('Friday')
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      : row.days.includes('Saturday')
        ? ['Saturday']
        : [row.days]
    return days.map((dayOfWeek) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek,
      opens,
      closes,
    }))
  })

  const sameAs = [
    BUSINESS.social.facebook,
    BUSINESS.social.instagram,
    BUSINESS.social.google,
    reviewSummary?.reviewsUrl ?? BUSINESS.googleReviewsUrl,
  ].filter(Boolean)

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
      ...(BUSINESS.address?.streetAddress ? { streetAddress: BUSINESS.address.streetAddress } : {}),
      addressLocality: BUSINESS.address?.city ?? 'Modesto',
      addressRegion: BUSINESS.address?.state ?? 'CA',
      postalCode: BUSINESS.address?.postalCode ?? '95350',
      addressCountry: BUSINESS.address?.country ?? 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 37.6391,
      longitude: -120.9969,
    },
    openingHoursSpecification,
    areaServed: SERVICE_CITIES.map((city) => ({
      '@type': 'City',
      name: `${city.name}, ${city.state}`,
      containedInPlace: { '@type': 'State', name: 'California' },
    })),
    priceRange: '$$',
    serviceType: [
      'Window Cleaning',
      'Residential Window Cleaning',
      'Solar Panel Cleaning',
      'Gutter Cleaning',
      'Pressure Washing',
    ],
    ...(sameAs.length ? { sameAs } : {}),
    ...overrides,
  }

  const ratingValue = reviewSummary?.rating ?? BUSINESS.googleReviewRating
  const reviewCount = reviewSummary?.reviewCount ?? BUSINESS.googleReviews

  if (ratingValue != null && reviewCount != null) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(ratingValue),
      reviewCount: String(reviewCount),
      bestRating: '5',
    }
  }

  return schema
}

/**
 * Individual Review schema for homepage rich results support.
 *
 * @param {Array<{ reviewerName: string, rating: number, reviewText: string, date: string }>} reviews
 * @param {string} businessName
 */
export function getReviewSchemas(reviews, businessName = BUSINESS.name) {
  return reviews.slice(0, 6).map((review) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'LocalBusiness',
      name: businessName,
      '@id': `${SITE_URL}/#localbusiness`,
    },
    author: {
      '@type': 'Person',
      name: review.reviewerName,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: String(review.rating),
      bestRating: '5',
    },
    reviewBody: review.reviewText,
    datePublished: review.date,
  }))
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

export function getServiceAreasPageSchemas() {
  return [
    getOrganizationSchema(),
    getLocalBusinessSchema(),
    getBreadcrumbSchema([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Service Areas', url: absoluteUrl('/service-areas') },
    ]),
  ]
}

export function getThinCityFaqs(city) {
  return [
    {
      q: `Do you provide exterior cleaning in ${city.name}, CA?`,
      a: `Yes. ${BUSINESS.name} serves ${city.name} and nearby Central Valley communities with window cleaning, pressure washing, gutter cleaning, and solar panel cleaning. Call ${BUSINESS.phone} for a free estimate.`,
    },
    {
      q: `What services are available in ${city.name}?`,
      a: `We offer residential and commercial window cleaning, driveway and patio pressure washing, gutter cleaning and flushing, and safe solar panel washing for properties in ${city.name}, ${city.state}.`,
    },
    {
      q: `How do I get a quote for ${city.name}?`,
      a: `Use our instant quote calculator online, book an appointment at ${absoluteUrl('/book-online')}, or call ${BUSINESS.phone}. We respond within 24 hours — usually the same business day.`,
    },
  ]
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

export function getNotFoundPageSeo() {
  return {
    title: 'Page Not Found | Mike\'s Exterior Cleaning Services',
    description:
      'The page you requested could not be found. Browse our window cleaning, pressure washing, gutter, and solar services in Modesto and the Central Valley — or get an instant quote.',
    keywords: 'Mike\'s Exterior Cleaning Services, Modesto exterior cleaning',
    canonical: absoluteUrl('/404'),
  }
}

export function getInstantQuotePageSeo() {
  return {
    title: 'Instant Quote Calculator | Free Exterior Cleaning Estimate | Mike\'s Exterior',
    description:
      'Get an instant price estimate for window cleaning, pressure washing, gutter cleaning, and solar panel cleaning in Modesto and the Central Valley. Free, no obligation — results in under 2 minutes.',
    keywords:
      'instant quote window cleaning Modesto, exterior cleaning estimate, pressure washing quote Central Valley, gutter cleaning price, solar panel cleaning cost',
    canonical: absoluteUrl('/instant-quote'),
  }
}

export function getInstantQuotePageSchemas() {
  return [
    getOrganizationSchema(),
    getWebSiteSchema(),
    getBreadcrumbSchema([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Instant Quote', url: absoluteUrl('/instant-quote') },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${absoluteUrl('/instant-quote')}#webpage`,
      name: 'Instant Quote Calculator — Mike\'s Exterior Cleaning Services',
      description: getInstantQuotePageSeo().description,
      url: absoluteUrl('/instant-quote'),
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#localbusiness` },
      potentialAction: {
        '@type': 'InteractAction',
        target: absoluteUrl('/instant-quote'),
        name: 'Get instant exterior cleaning estimate',
      },
    },
  ]
}

export function getBookOnlinePageSeo() {
  return {
    title: 'Book Online | Schedule Exterior Cleaning | Mike\'s Exterior Cleaning',
    description:
      'Request an appointment for window cleaning, pressure washing, gutter cleaning, or solar panel service in Modesto and the Central Valley. Choose your preferred date and time — Mike confirms availability personally.',
    keywords:
      'book window cleaning Modesto, schedule pressure washing Central Valley, exterior cleaning appointment, book gutter cleaning online, solar panel cleaning booking',
    canonical: absoluteUrl('/book-online'),
  }
}

export function getBookOnlinePageSchemas() {
  return [
    getLocalBusinessSchema({
      potentialAction: {
        '@type': 'ReserveAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: absoluteUrl('/book-online'),
          actionPlatform: [
            'http://schema.org/DesktopWebPlatform',
            'http://schema.org/MobileWebPlatform',
          ],
        },
        result: {
          '@type': 'Reservation',
          name: 'Exterior Cleaning Appointment Request',
        },
      },
    }),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${absoluteUrl('/book-online')}#webpage`,
      name: 'Book Online — Mike\'s Exterior Cleaning Services',
      description: getBookOnlinePageSeo().description,
      url: absoluteUrl('/book-online'),
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#localbusiness` },
      potentialAction: {
        '@type': 'ReserveAction',
        target: absoluteUrl('/book-online'),
      },
    },
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
