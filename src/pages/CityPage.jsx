import { Link, useParams, Navigate } from 'react-router-dom'
import { BUSINESS } from '../config/business'
import { getCityBySlug, getNearbyCityNames } from '../config/serviceAreas'
import { getCityPageSeo, getLocalBusinessSchema, getBreadcrumbSchema } from '../config/seo'
import { absoluteUrl } from '../config/site'
import { SERVICE_PAGES } from '../content/services'
import { WINDOW_CLEANING_CITY_SLUGS } from '../content/cities/window-cleaning'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import ScrollReveal from '../components/ScrollReveal'
import { CallButton, QuoteButton } from '../components/ui/Button'

export default function CityPage() {
  const { citySlug } = useParams()
  const city = getCityBySlug(citySlug)

  if (!city) {
    return <Navigate to="/service-areas" replace />
  }

  const pageSeo = getCityPageSeo(city)
  const nearby = getNearbyCityNames(city.slug).slice(0, 6)
  const hasWindowCleaningPage = WINDOW_CLEANING_CITY_SLUGS.includes(city.slug)

  const schemas = [
    getLocalBusinessSchema({
      areaServed: [{ '@type': 'City', name: `${city.name}, ${city.state}` }],
    }),
    getBreadcrumbSchema([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Service Areas', url: absoluteUrl('/service-areas') },
      { name: `${city.name}, ${city.state}`, url: pageSeo.canonical },
    ]),
  ]

  return (
    <>
      <SeoHead {...pageSeo} />
      <JsonLd data={schemas} id={`city-${city.slug}`} />

      <section className="section-padding bg-navy-950 pt-32" aria-labelledby="city-hero-heading">
        <div className="section-container">
          <nav className="mb-6 text-[0.8125rem] text-white/50" aria-label="Breadcrumb">
            <Link to="/" className="transition-colors hover:text-white/80">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/service-areas" className="transition-colors hover:text-white/80">Service Areas</Link>
            <span className="mx-2">/</span>
            <span className="text-white/80">{city.name}</span>
          </nav>
          <h1 id="city-hero-heading" className="font-display max-w-3xl text-3xl font-semibold text-white sm:text-4xl">
            Exterior Cleaning in {city.name}, {city.state}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70">{city.description}</p>
          <p className="mt-4 max-w-2xl text-[0.9375rem] text-white/55">
            {BUSINESS.name} provides window cleaning, pressure washing, solar panel cleaning, gutter cleaning,
            and commercial window services throughout {city.county} and the greater Central Valley.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <QuoteButton variant="primary" />
            <CallButton variant="secondary" />
          </div>
        </div>
      </section>

      <section className="section-padding bg-section-services" aria-labelledby="city-services">
        <div className="section-container">
          <ScrollReveal className="section-header">
            <h2 id="city-services" className="section-title">
              Services in {city.name}
            </h2>
            <p className="section-subtitle">
              Every service includes a free estimate tailored to your {city.name} property.
            </p>
          </ScrollReveal>
          <div className="section-content grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hasWindowCleaningPage && (
              <ScrollReveal>
                <Link to={`/window-cleaning/${city.slug}`} className="card group block border-royal-200/60 bg-royal-50/30 p-6 hover:shadow-lg">
                  <h3 className="font-display text-lg font-semibold text-navy-900 group-hover:text-royal-700">
                    Window Cleaning in {city.name}
                  </h3>
                  <p className="mt-2 text-[0.875rem] text-gray-500">
                    Local neighborhoods, FAQs &amp; free estimates →
                  </p>
                </Link>
              </ScrollReveal>
            )}
            {SERVICE_PAGES.map((s, i) => (
              <ScrollReveal key={s.slug} stagger={i + 1}>
                <Link to={`/services/${s.slug}`} className="card group block p-6 hover:shadow-lg">
                  <h3 className="font-display text-lg font-semibold text-navy-900 group-hover:text-royal-700">
                    {s.serviceName}
                  </h3>
                  <p className="mt-2 text-[0.875rem] text-gray-500">
                    {s.serviceName} for {city.name} homes and businesses →
                  </p>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <h2 className="font-display text-2xl font-semibold text-navy-900">
              Why {city.name} Property Owners Choose {BUSINESS.shortName}
            </h2>
            <div className="mt-6 space-y-5 text-[1rem] leading-[1.75] text-gray-600">
              <p>
                Central Valley properties face a unique combination of agricultural dust, seasonal pollen,
                hard water spotting, and intense summer sun. In {city.name}, that means exterior surfaces need
                consistent professional care — not a once-a-year hose-down. Our crews arrive with commercial-grade
                equipment, eco-friendly solutions, and the experience to protect stucco, tile, concrete, glass, and
                landscaping on every job.
              </p>
              <p>
                We are fully insured, offer free estimates with no obligation, and maintain a 5.0 Google rating
                across 44 reviews from real customers. Whether you need a single driveway refreshed before a
                gathering or a recurring window program for a commercial storefront, we build a plan around your
                property — not a one-size-fits-all menu price.
              </p>
              <p>
                {city.name} sits within easy reach of our Modesto home base, which means responsive scheduling,
                reliable arrival windows, and fair travel pricing compared to companies dispatching from the Bay
                Area or Southern California. We also serve nearby communities including {nearby.join(', ')}, and
                throughout Stanislaus and San Joaquin counties.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-padding bg-section-areas">
        <div className="section-container text-center">
          <h2 className="font-display text-2xl font-semibold text-navy-900">Ready for a Free Estimate in {city.name}?</h2>
          <p className="mx-auto mt-4 max-w-lg text-gray-600">
            Call {BUSINESS.phone} or request a quote online. We typically respond within 24 hours.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <QuoteButton variant="royal" />
            <CallButton variant="secondary" />
          </div>
          <p className="mt-8">
            <Link to="/service-areas" className="text-[0.9375rem] font-semibold text-royal-600 hover:text-royal-700">
              ← View all service areas
            </Link>
          </p>
        </div>
      </section>
    </>
  )
}
