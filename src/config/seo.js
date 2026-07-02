import { BUSINESS } from './business'

export const SEO = {
  title: "Mike's Exterior Cleaning Services | Window Cleaning Modesto & Central Valley",
  description:
    'Premium window cleaning, solar panel cleaning, roof cleaning, gutter cleaning, and pressure washing in Modesto, Manteca, Riverbank, Turlock, Salida & Ripon. 5.0 rating with 44 Google reviews. Free estimates.',
  keywords: [
    'Window Cleaning Modesto',
    'Pressure Washing Modesto',
    'Solar Panel Cleaning Modesto',
    'Gutter Cleaning Modesto',
    'Window Cleaning Manteca',
    'Window Cleaning Riverbank',
    'Window Cleaning Turlock',
    'Window Cleaning Ripon',
    'Window Cleaning Salida',
    'exterior cleaning Central Valley',
    "Mike's Exterior Cleaning Services",
  ].join(', '),
  canonical: 'https://mikesexteriorcleaning.com',
}

export function getLocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: BUSINESS.name,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    description: BUSINESS.description,
    areaServed: BUSINESS.serviceAreas.map((city) => ({
      '@type': 'City',
      name: city,
      containedInPlace: { '@type': 'State', name: 'California' },
    })),
    priceRange: '$$',
    serviceType: [
      'Window Cleaning',
      'Solar Panel Cleaning',
      'Gutter Cleaning',
      'Pressure Washing',
    ],
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
