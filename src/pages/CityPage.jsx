import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { BUSINESS } from '../config/business'
import { getCityBySlug } from '../config/serviceAreas'
import { getLocationPage, getOtherLocationPages } from '../content/cities/location'
import { WINDOW_CLEANING_CITY_SLUGS } from '../content/cities/window-cleaning'
import { getLocationPageSchemas, getCityPageSeo, getLocalBusinessSchema, getBreadcrumbSchema } from '../config/seo'
import { absoluteUrl, DEFAULT_OG_IMAGE } from '../config/site'
import { SERVICE_PAGES } from '../content/services'
import { getNearbyCityNames } from '../config/serviceAreas'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import ScrollReveal from '../components/ScrollReveal'
import { CallButton, QuoteButton, BookOnlineButton } from '../components/ui/Button'
import GoogleReviewsBadge from '../components/ui/GoogleReviewsBadge'
import ServiceTrustBadges from '../components/service/ServiceTrustBadges'
import ServiceCta from '../components/service/ServiceCta'

function CityFaq({ faqs }) {
  const [open, setOpen] = useState(0)
  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => {
        const isOpen = open === i
        return (
          <div
            key={faq.q}
            className={`overflow-hidden rounded-[1rem] border bg-white transition-[border-color,box-shadow] duration-300 ${isOpen ? 'border-royal-200/50 shadow-[0_4px_20px_rgba(37,99,235,0.06)]' : 'border-black/[0.04]'}`}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="flex w-full min-h-[56px] items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
            >
              <span className="text-[0.9375rem] font-semibold text-navy-900">{faq.q}</span>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all ${isOpen ? 'rotate-45 bg-royal-50 text-royal-600' : ''}`} aria-hidden="true">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              </span>
            </button>
            <div className={`grid transition-all duration-400 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-[0.9375rem] leading-[1.75] text-gray-500 sm:px-6">{faq.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CityBreadcrumbs({ cityName }) {
  return (
    <nav className="text-[0.8125rem] text-white/55 sm:text-sm" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li><Link to="/" className="transition-colors hover:text-white/90">Home</Link></li>
        <li className="text-white/35" aria-hidden="true">/</li>
        <li><Link to="/service-areas" className="transition-colors hover:text-white/90">Service Areas</Link></li>
        <li className="text-white/35" aria-hidden="true">/</li>
        <li><span className="text-white/85" aria-current="page">{cityName}</span></li>
      </ol>
    </nav>
  )
}

/** Thin fallback for cities without full location content (Manteca, Tracy, Stockton). */
function CityPageBasic({ city }) {
  const pageSeo = getCityPageSeo(city)
  const nearby = getNearbyCityNames(city.slug).slice(0, 5)
  const hasWindowCleaningPage = WINDOW_CLEANING_CITY_SLUGS.includes(city.slug)

  const schemas = [
    getLocalBusinessSchema({ areaServed: [{ '@type': 'City', name: `${city.name}, ${city.state}` }] }),
    getBreadcrumbSchema([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Service Areas', url: absoluteUrl('/service-areas') },
      { name: `${city.name}, ${city.state}`, url: pageSeo.canonical },
    ]),
  ]

  return (
    <>
      <SeoHead {...pageSeo} ogImage={DEFAULT_OG_IMAGE} />
      <JsonLd data={schemas} id={`city-basic-${city.slug}`} />
      <section className="section-padding bg-navy-950 pt-32" aria-labelledby="city-basic-hero">
        <div className="section-container">
          <CityBreadcrumbs cityName={city.name} />
          <h1 id="city-basic-hero" className="font-display mt-6 max-w-3xl text-3xl font-semibold text-white sm:text-4xl">
            Exterior Cleaning in {city.name}, {city.state}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70">{city.description}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <BookOnlineButton variant="primary" />
            <QuoteButton variant="secondary" />
            <CallButton variant="secondary" />
          </div>
        </div>
      </section>
      <section className="section-padding bg-section-services">
        <div className="section-container">
          <h2 className="section-title text-center">Services in {city.name}</h2>
          <div className="section-content grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hasWindowCleaningPage && (
              <Link to={`/window-cleaning/${city.slug}`} className="card group p-6 hover:shadow-lg">
                <h3 className="font-display text-lg font-semibold text-navy-900 group-hover:text-royal-700">Window Cleaning in {city.name}</h3>
              </Link>
            )}
            {SERVICE_PAGES.map((s) => (
              <Link key={s.slug} to={`/services/${s.slug}`} className="card group p-6 hover:shadow-lg">
                <h3 className="font-display text-lg font-semibold text-navy-900 group-hover:text-royal-700">{s.serviceName}</h3>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-center text-gray-600">
            Also serving {nearby.join(', ')}. Call {BUSINESS.phone} for a free estimate.
          </p>
        </div>
      </section>
    </>
  )
}

export default function CityPage() {
  const { citySlug } = useParams()
  const city = getCityBySlug(citySlug)
  const page = getLocationPage(citySlug)

  if (!city) {
    return <Navigate to="/service-areas" replace />
  }

  if (!page) {
    return <CityPageBasic city={city} />
  }

  const canonical = absoluteUrl(`/service-areas/${citySlug}`)
  const hasWindowCleaningPage = WINDOW_CLEANING_CITY_SLUGS.includes(city.slug)
  const otherLocations = getOtherLocationPages(citySlug)

  const schemas = getLocationPageSchemas({
    cityName: page.cityName,
    state: page.state,
    description: page.meta.description,
    citySlug,
    faqs: page.faqs,
  })

  return (
    <>
      <SeoHead
        title={page.meta.title}
        description={page.meta.description}
        keywords={page.meta.keywords}
        canonical={canonical}
        ogImage={DEFAULT_OG_IMAGE}
      />
      <JsonLd data={schemas} id={`location-${citySlug}`} />

      <section className="relative flex min-h-[44vh] items-end overflow-hidden bg-navy-950 sm:min-h-[50vh]" aria-labelledby="city-hero-heading">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900" aria-hidden="true" />
        <div className="section-container relative w-full pb-12 pt-28 sm:pb-14 sm:pt-32">
          <CityBreadcrumbs cityName={page.cityName} />
          <h1 id="city-hero-heading" className="font-display mt-5 max-w-3xl text-[1.875rem] font-semibold leading-[1.14] text-white sm:text-4xl">
            {page.hero.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-white/75 sm:text-lg">{page.hero.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <BookOnlineButton variant="primary" />
            <QuoteButton variant="secondary" />
            <CallButton variant="secondary" />
          </div>
          <div className="mt-6"><GoogleReviewsBadge variant="dark" size="sm" /></div>
        </div>
      </section>

      <section className="border-b border-black/[0.04] bg-white py-8 sm:py-10" aria-label="Trust badges">
        <div className="section-container"><ServiceTrustBadges /></div>
      </section>

      <section className="service-section bg-white" aria-labelledby={`${citySlug}-intro`}>
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <h2 id={`${citySlug}-intro`} className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">{page.sections.intro.title}</h2>
            <div className="service-prose mt-6">
              {page.sections.intro.paragraphs.map((p) => <p key={p.slice(0, 48)}>{p}</p>)}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="service-section bg-section-services" aria-labelledby={`${citySlug}-services`}>
        <div className="section-container">
          <ScrollReveal className="section-header max-w-2xl">
            <h2 id={`${citySlug}-services`} className="section-title">{page.sections.services.title}</h2>
          </ScrollReveal>
          <div className="section-content grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {page.sections.services.items.map((item, i) => (
              <ScrollReveal key={item.slug} stagger={i + 1}>
                <Link to={`/services/${item.slug}`} className="card group block h-full p-6 hover:shadow-lg">
                  <h3 className="text-[1rem] font-semibold text-navy-900 group-hover:text-royal-700">{item.name}</h3>
                  <p className="mt-2.5 text-[0.9375rem] leading-[1.65] text-gray-600">{item.text}</p>
                  <span className="mt-4 inline-block text-[0.875rem] font-semibold text-royal-600">Learn more →</span>
                </Link>
              </ScrollReveal>
            ))}
            {hasWindowCleaningPage && (
              <ScrollReveal>
                <Link to={`/window-cleaning/${city.slug}`} className="card group block h-full border-royal-200/60 bg-royal-50/30 p-6 hover:shadow-lg">
                  <h3 className="text-[1rem] font-semibold text-navy-900 group-hover:text-royal-700">Window Cleaning — {page.cityName} Detail Page</h3>
                  <p className="mt-2.5 text-[0.9375rem] leading-[1.65] text-gray-600">Neighborhoods, FAQs, and local window cleaning expertise.</p>
                  <span className="mt-4 inline-block text-[0.875rem] font-semibold text-royal-600">View page →</span>
                </Link>
              </ScrollReveal>
            )}
          </div>
        </div>
      </section>

      <section className="service-section bg-white" aria-labelledby={`${citySlug}-conditions`}>
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <h2 id={`${citySlug}-conditions`} className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">{page.sections.localConditions.title}</h2>
            <div className="service-prose mt-6">
              {page.sections.localConditions.paragraphs.map((p) => <p key={p.slice(0, 48)}>{p}</p>)}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="service-section bg-section-services">
        <div className="section-container max-w-3xl">
          <ScrollReveal><ServiceCta headline={`Free Estimate in ${page.cityName}`} text={`Call ${BUSINESS.phone} — every ${page.cityName} property quoted individually with no obligation.`} /></ScrollReveal>
        </div>
      </section>

      <section className="service-section bg-white" aria-labelledby={`${citySlug}-neighborhoods`}>
        <div className="section-container">
          <ScrollReveal className="section-header max-w-2xl">
            <h2 id={`${citySlug}-neighborhoods`} className="section-title">{page.sections.neighborhoods.title}</h2>
          </ScrollReveal>
          <div className="section-content grid gap-4 sm:grid-cols-2">
            {page.sections.neighborhoods.items.map((item, i) => (
              <ScrollReveal key={item.name} stagger={i + 1}>
                <article className="glass-card h-full p-6 sm:p-7">
                  <h3 className="text-[1rem] font-semibold text-navy-900">{item.name}</h3>
                  <p className="mt-2.5 text-[0.9375rem] leading-[1.7] text-gray-600">{item.text}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="service-section bg-navy-900" aria-labelledby={`${citySlug}-why`}>
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <h2 id={`${citySlug}-why`} className="font-display text-2xl font-semibold text-white sm:text-3xl">{page.sections.whyChoose.title}</h2>
            <div className="mt-6 space-y-5 text-[1rem] leading-[1.75] text-white/60">
              {page.sections.whyChoose.paragraphs.map((p) => <p key={p.slice(0, 48)}>{p}</p>)}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="service-section bg-section-faq" aria-labelledby={`${citySlug}-faq`}>
        <div className="section-container max-w-2xl">
          <ScrollReveal className="section-header">
            <p className="section-label">FAQ</p>
            <h2 id={`${citySlug}-faq`} className="section-title">{page.cityName} Exterior Cleaning Questions</h2>
          </ScrollReveal>
          <ScrollReveal className="section-content"><CityFaq faqs={page.faqs} /></ScrollReveal>
        </div>
      </section>

      <section className="service-section bg-section-areas" aria-labelledby={`${citySlug}-nearby`}>
        <div className="section-container">
          <ScrollReveal className="section-header max-w-2xl">
            <h2 id={`${citySlug}-nearby`} className="section-title">More Service Areas</h2>
          </ScrollReveal>
          <div className="section-content grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherLocations.map((loc) => (
              <Link key={loc.citySlug} to={`/service-areas/${loc.citySlug}`} className="card group p-6 hover:shadow-lg">
                <h3 className="font-display text-lg font-semibold text-navy-900 group-hover:text-royal-700">Exterior Cleaning {loc.cityName}</h3>
                <p className="mt-2 text-[0.875rem] text-gray-500">{loc.county} →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="service-section bg-navy-900 text-center" aria-labelledby={`${citySlug}-cta`}>
        <div className="section-container max-w-2xl">
          <ScrollReveal>
            <h2 id={`${citySlug}-cta`} className="font-display text-2xl font-semibold text-white sm:text-3xl">{page.cta.headline}</h2>
            <p className="mt-4 text-[0.9375rem] text-white/65">{page.cta.text}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <BookOnlineButton variant="primary" />
              <QuoteButton variant="secondary" />
              <CallButton variant="secondary" />
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  )
}
