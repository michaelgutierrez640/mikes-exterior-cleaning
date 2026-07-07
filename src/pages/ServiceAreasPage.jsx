import { Link } from 'react-router-dom'
import { BUSINESS } from '../config/business'
import { SERVICE_CITIES } from '../config/serviceAreas'
import { WINDOW_CLEANING_CITY_SLUGS } from '../content/cities/window-cleaning'
import { getServiceAreasPageSeo, getServiceAreasPageSchemas } from '../config/seo'
import { absoluteUrl } from '../config/site'
import { SERVICE_PAGES } from '../content/services'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import ScrollReveal from '../components/ScrollReveal'
import { CallButton, QuoteButton } from '../components/ui/Button'

const pageSeo = getServiceAreasPageSeo()

export default function ServiceAreasPage() {
  const schemas = getServiceAreasPageSchemas()

  return (
    <>
      <SeoHead {...pageSeo} />
      <JsonLd data={schemas} id="service-areas-schema" />

      <section className="section-padding bg-navy-950 pt-32" aria-labelledby="areas-page-heading">
        <div className="section-container">
          <nav className="mb-6 text-[0.8125rem] text-white/50" aria-label="Breadcrumb">
            <Link to="/" className="transition-colors hover:text-white/80">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-white/80">Service Areas</span>
          </nav>
          <h1 id="areas-page-heading" className="font-display max-w-3xl text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Exterior Cleaning Service Areas in California&apos;s Central Valley
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            {BUSINESS.name} is based in Modesto, CA and serves homeowners, property managers, and businesses
            throughout Stanislaus and San Joaquin counties. Select your city below to learn how we can help — or
            call {BUSINESS.phone} for a free estimate anywhere in our service region.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <QuoteButton variant="primary" />
            <CallButton variant="secondary" />
          </div>
        </div>
      </section>

      <section className="section-padding bg-section-areas" aria-labelledby="cities-heading">
        <div className="section-container">
          <ScrollReveal className="section-header">
            <h2 id="cities-heading" className="section-title">Cities We Serve</h2>
            <p className="section-subtitle">
              Select your city for local exterior cleaning information, or browse dedicated window cleaning pages below.
            </p>
          </ScrollReveal>

          <div className="section-content grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_CITIES.map((city, i) => (
              <ScrollReveal key={city.slug} stagger={i + 1}>
                <Link
                  to={`/service-areas/${city.slug}`}
                  className="card group flex h-full flex-col p-7 transition-shadow duration-300 hover:shadow-lg"
                >
                  <h3 className="font-display text-xl font-semibold text-navy-900 group-hover:text-royal-700">
                    {city.name}, {city.state}
                  </h3>
                  <p className="mt-2 text-[0.8125rem] font-medium text-royal-600">{city.county}</p>
                  <p className="mt-4 flex-1 text-[0.9375rem] leading-[1.65] text-gray-500">{city.description}</p>
                  <span className="mt-5 text-[0.875rem] font-semibold text-royal-600">View {city.name} services →</span>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white" aria-labelledby="window-cleaning-cities">
        <div className="section-container">
          <ScrollReveal className="section-header max-w-2xl">
            <h2 id="window-cleaning-cities" className="section-title">
              Window Cleaning by City
            </h2>
            <p className="section-subtitle">
              Dedicated landing pages with local neighborhoods, FAQs, and free estimates for each community we serve.
            </p>
          </ScrollReveal>
          <ScrollReveal className="section-content">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICE_CITIES.filter((c) => WINDOW_CLEANING_CITY_SLUGS.includes(c.slug)).map((city, i) => (
                <Link
                  key={city.slug}
                  to={`/window-cleaning/${city.slug}`}
                  className="card group p-6 transition-shadow hover:shadow-lg"
                >
                  <h3 className="font-display text-lg font-semibold text-navy-900 group-hover:text-royal-700">
                    Window Cleaning {city.name}
                  </h3>
                  <p className="mt-2 text-[0.875rem] text-gray-500">Local page with FAQs →</p>
                </Link>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-padding bg-white" aria-labelledby="services-by-area">
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <h2 id="services-by-area" className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              Services Available in Every Service Area
            </h2>
            <p className="mt-4 text-[1rem] leading-[1.75] text-gray-600">
              No matter which Central Valley community you are in, we offer the same professional standards,
              insured crews, and free on-site estimates. Explore our dedicated service pages for details on
              scope, process, and scheduling.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {SERVICE_PAGES.map((s) => (
                <li key={s.slug}>
                  <Link
                    to={`/services/${s.slug}`}
                    className="text-[0.9375rem] font-semibold text-royal-600 hover:text-royal-700"
                  >
                    {s.serviceName}
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-padding bg-navy-900 text-center">
        <div className="section-container max-w-xl">
          <h2 className="font-display text-2xl font-semibold text-white">Don&apos;t See Your City?</h2>
          <p className="mt-4 text-white/65">
            We regularly travel beyond our core list. Contact us — if you are near Modesto, we can usually help.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <QuoteButton variant="primary" />
            <CallButton variant="secondary" />
          </div>
        </div>
      </section>
    </>
  )
}
