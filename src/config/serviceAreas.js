/**
 * Service area cities — hub for /service-areas and future city landing pages.
 * Modesto is the primary market; surrounding cities link to /service-areas/:slug.
 */

export const PRIMARY_CITY = {
  slug: 'modesto',
  name: 'Modesto',
  county: 'Stanislaus County',
  state: 'CA',
  description:
    'Modesto is home base for Mike\'s Exterior Cleaning Services. We serve residential and commercial properties throughout the city and surrounding neighborhoods with window cleaning, pressure washing, solar panel cleaning, gutter cleaning, and commercial window care.',
}

export const SERVICE_CITIES = [
  PRIMARY_CITY,
  {
    slug: 'salida',
    name: 'Salida',
    county: 'Stanislaus County',
    state: 'CA',
    description:
      'Professional exterior cleaning for Salida homes and small businesses, including window cleaning, driveway pressure washing, and gutter maintenance.',
  },
  {
    slug: 'riverbank',
    name: 'Riverbank',
    county: 'Stanislaus County',
    state: 'CA',
    description:
      'Riverbank homeowners trust us for streak-free windows, roof-adjacent gutter cleaning, and solar panel washing across the Central Valley climate.',
  },
  {
    slug: 'oakdale',
    name: 'Oakdale',
    county: 'Stanislaus County',
    state: 'CA',
    description:
      'Exterior cleaning services in Oakdale — from ranch-style window packages to patio and walkway pressure washing before gatherings and listing photos.',
  },
  {
    slug: 'ripon',
    name: 'Ripon',
    county: 'San Joaquin County',
    state: 'CA',
    description:
      'Ripon properties benefit from regular window, gutter, and concrete cleaning that handles almond-country dust and seasonal pollen buildup.',
  },
  {
    slug: 'turlock',
    name: 'Turlock',
    county: 'Stanislaus County',
    state: 'CA',
    description:
      'Turlock window cleaning, solar panel maintenance, and pressure washing with flexible scheduling for CSU-area rentals and family homes alike.',
  },
  {
    slug: 'ceres',
    name: 'Ceres',
    county: 'Stanislaus County',
    state: 'CA',
    description:
      'Ceres exterior cleaning for driveways, storefront glass, residential gutters, and solar arrays — free estimates for every property type.',
  },
  {
    slug: 'manteca',
    name: 'Manteca',
    county: 'San Joaquin County',
    state: 'CA',
    description:
      'Manteca homeowners and property managers rely on us for reliable, insured exterior cleaning with clear communication and fair pricing.',
  },
  {
    slug: 'tracy',
    name: 'Tracy',
    county: 'San Joaquin County',
    state: 'CA',
    description:
      'Tracy exterior services including window cleaning, concrete pressure washing, and commercial storefront glass for growing neighborhoods and retail corridors.',
  },
  {
    slug: 'stockton',
    name: 'Stockton',
    county: 'San Joaquin County',
    state: 'CA',
    description:
      'Select Stockton service areas for commercial window cleaning, multi-story residential glass, and large-format pressure washing projects.',
  },
  {
    slug: 'patterson',
    name: 'Patterson',
    county: 'Stanislaus County',
    state: 'CA',
    description:
      'West Stanislaus exterior cleaning for Patterson homes near I-5, Sperry Avenue, and downtown — windows, driveways, gutters, and solar from our Modesto team.',
  },
]

export const SERVICE_CITY_NAMES = SERVICE_CITIES.map((c) => c.name)

export function getCityBySlug(slug) {
  return SERVICE_CITIES.find((c) => c.slug === slug) ?? null
}

export function getNearbyCityNames(excludeSlug) {
  return SERVICE_CITIES.filter((c) => c.slug !== excludeSlug).map((c) => c.name)
}
