/**
 * Shared service × city page content builder.
 * Uses city config + optional location hub details so each URL is locally specific,
 * not a thin city-name swap of the parent service page.
 */
import { getLocationPage } from '../content/cities/location'

const SERVICE_LOCAL_ANGLE = {
  'window-cleaning':
    'hard water spotting from irrigation, agricultural dust on patio glass, and two-story window packages common on west-side homes',
  'residential-window-cleaning':
    'interior and exterior home glass, screen cleaning, and move-in preparation after valley dust seasons',
  'pressure-washing':
    'driveway and sidewalk restoration where valley dust and farm traffic leave concrete looking dull within a season',
  'solar-panel-cleaning':
    'roof-safe rinsing for arrays that lose output to west-side dust, pollen, and dry-season film',
  'gutter-cleaning':
    'hand debris removal and downspout flushing before winter storms overwhelm clogged channels',
  'pigeon-guard':
    'bird deterrent protection for solar arrays and rooflines where nesting debris cuts production and creates fire risk',
}

export function buildServiceCityContent(serviceSlug, city, servicePage) {
  const cityName = city.name
  const county = city.county || 'the Central Valley'
  const state = city.state || 'CA'
  const serviceName = servicePage.serviceName || serviceSlug.replace(/-/g, ' ')
  const location = getLocationPage(city.slug)
  const angle = SERVICE_LOCAL_ANGLE[serviceSlug] || 'professional exterior care matched to local conditions'
  const neighborhoods = (location?.sections?.neighborhoods?.items || []).slice(0, 3).map((n) => n.name)
  const neighborhoodPhrase = neighborhoods.length
    ? neighborhoods.join(', ')
    : `${cityName} neighborhoods across ${county}`

  const title = `${serviceName} in ${cityName}, ${state} | Mike's Exterior`
  const description = `Professional ${serviceName.toLowerCase()} in ${cityName}, ${state} (${county}). ${angle.charAt(0).toUpperCase() + angle.slice(1)}. Free estimates — call (209) 496-5519.`

  const h1 = `${serviceName} in ${cityName}, ${state}`
  const heroSubtitle = `${city.description || `Insured exterior cleaning for ${cityName} homes and businesses.`} We schedule ${serviceName.toLowerCase()} from our Modesto base for properties throughout ${neighborhoodPhrase}.`

  const introTitle = `${serviceName} for ${cityName} Properties`
  const introParagraphs = [
    `Mike's Exterior Cleaning Services provides ${serviceName.toLowerCase()} in ${cityName}, ${state} — part of our regular ${county} routes from Modesto. ${city.description}`,
    location?.sections?.localConditions?.paragraphs?.[0]
      ? `${location.sections.localConditions.paragraphs[0]} That local pattern is exactly why ${serviceName.toLowerCase()} in ${cityName} works better on a recurring schedule than a one-off DIY attempt.`
      : `${cityName} properties contend with Central Valley dust, irrigation minerals, and seasonal pollen. Professional ${serviceName.toLowerCase()} removes buildup before it etches glass, stains concrete, or cuts solar output.`,
    `Every ${cityName} visit starts with a free on-site estimate. We assess access, surface condition, and scope before quoting — no phone guesses and no pressure to bundle services you do not need.`,
  ]

  const faqs = [
    {
      q: `Do you offer ${serviceName.toLowerCase()} in ${cityName}?`,
      a: `Yes. ${cityName} is inside our ${county} service area. We travel from Modesto for residential and commercial ${serviceName.toLowerCase()} with clear scheduling and free estimates.`,
    },
    {
      q: `Which ${cityName} areas do you cover?`,
      a: neighborhoods.length
        ? `We regularly serve ${neighborhoodPhrase}, plus surrounding ${cityName} streets in ${county}. Call if you are unsure — we will confirm during your free estimate.`
        : `We serve ${cityName} and nearby ${county} communities. Share your address when you request an estimate and we will confirm coverage.`,
    },
    {
      q: `How is ${serviceName.toLowerCase()} in ${cityName} different from Modesto?`,
      a: `${cityName}'s west-side and agricultural surroundings create a different dust and irrigation profile than denser Modesto corridors. We adjust technique and frequency for ${angle} common on ${cityName} properties — same insured crew, locally aware approach.`,
    },
    {
      q: `Can I see completed ${serviceName.toLowerCase()} work in ${cityName}?`,
      a: `Published ${cityName} projects appear on this page when available. If none are listed yet, browse our projects gallery or request a free estimate — we never invent or substitute unrelated city jobs.`,
    },
    {
      q: `How do I get a free ${cityName} estimate?`,
      a: `Call (209) 496-5519, use Instant Quote, or book online. We walk the property, explain the scope, and provide a clear written quote with no obligation.`,
    },
  ]

  const keywords = [
    `${serviceName} ${cityName}`,
    `${serviceName} ${cityName} CA`,
    `${cityName} ${serviceName.toLowerCase()}`,
    county,
    'Central Valley',
  ].join(', ')

  return {
    title,
    description,
    keywords,
    h1,
    heroSubtitle,
    introTitle,
    introParagraphs,
    faqs,
    serviceName,
    cityName,
    county,
    state,
  }
}
