import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import NotFoundPage from './NotFoundPage'
import { BUSINESS } from '../config/business'
import { absoluteUrl } from '../config/site'
import { getServiceImage } from '../config/images'
import { getWindowCleaningCityPageSchemas } from '../config/seo'
import { getWindowCleaningCityPage } from '../content/cities/window-cleaning'
import { SERVICE_PAGES } from '../content/services'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import ScrollReveal from '../components/ScrollReveal'
import ResponsiveImage from '../components/ui/ResponsiveImage'
import { CallButton, InstantQuoteButton, BookOnlineButton } from '../components/ui/Button'
import GoogleReviewsBadge from '../components/ui/GoogleReviewsBadge'
import WindowCleaningCityBreadcrumbs from '../components/service/WindowCleaningCityBreadcrumbs'
import ServiceCta from '../components/service/ServiceCta'
import ServiceTrustBadges from '../components/service/ServiceTrustBadges'
import WindowCleaningCitiesNav from '../components/service/WindowCleaningCitiesNav'
import RelatedProjects from '../components/projects/RelatedProjects'

function CityFaq({ faqs }) {
  const [open, setOpen] = useState(0)

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => {
        const isOpen = open === i
        return (
          <div
            key={faq.q}
            className={`overflow-hidden rounded-[1rem] border bg-white transition-[border-color,box-shadow] duration-300 ${isOpen ? 'border-royal-200/50 shadow-[0_4px_20px_rgba(37,99,235,0.06)]' : 'border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.03)]'}`}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="flex w-full min-h-[56px] items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
            >
              <span className="text-[0.9375rem] font-semibold text-navy-900 sm:text-base">{faq.q}</span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all duration-300 ${isOpen ? 'rotate-45 bg-royal-50 text-royal-600' : ''}`}
                aria-hidden="true"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </span>
            </button>
            <div className={`grid transition-all duration-400 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
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

const RELATED_SLUGS = ['pressure-washing', 'gutter-cleaning', 'solar-panel-cleaning', 'residential-window-cleaning']

export default function WindowCleaningCityPage() {
  const { citySlug } = useParams()
  const page = getWindowCleaningCityPage(citySlug)

  if (!page) {
    return <NotFoundPage />
  }

  const { meta, hero, sections, faqs, cta, cityName, county, state } = page
  const canonical = absoluteUrl(`/window-cleaning/${citySlug}`)
  const heroImage = getServiceImage('window-cleaning')
  const relatedServices = RELATED_SLUGS.map((s) => SERVICE_PAGES.find((p) => p.slug === s)).filter(Boolean)

  const schemas = getWindowCleaningCityPageSchemas({
    cityName,
    state,
    description: meta.description,
    citySlug,
    faqs,
  })

  return (
    <>
      <SeoHead title={meta.title} description={meta.description} keywords={meta.keywords} canonical={canonical} />
      <JsonLd data={schemas} id={`wc-city-${citySlug}`} />

      {/* Hero */}
      <section
        className="relative flex min-h-[44vh] items-end overflow-hidden bg-navy-950 sm:min-h-[50vh]"
        aria-labelledby="wc-city-hero"
      >
        <ResponsiveImage
          src={heroImage?.src ?? '/images/before-after/img-0947-after.jpg'}
          webp={heroImage?.webp}
          srcSet={heroImage?.srcSet}
          alt={hero.imageAlt}
          className="absolute inset-0 h-full w-full object-cover"
          style={heroImage?.objectPosition ? { objectPosition: heroImage.objectPosition } : undefined}
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-navy-950/65" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/45 to-navy-950/25" />

        <div className="section-container relative w-full pb-12 pt-28 sm:pb-14 sm:pt-32">
          <WindowCleaningCityBreadcrumbs cityName={cityName} />
          <h1
            id="wc-city-hero"
            className="font-display mt-5 max-w-3xl text-[1.875rem] font-semibold leading-[1.14] text-white sm:mt-6 sm:text-4xl lg:text-[2.75rem]"
          >
            {hero.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-white/75 sm:mt-5 sm:text-lg">
            {hero.subtitle}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 sm:gap-4">
            <BookOnlineButton variant="primary" />
            <InstantQuoteButton variant="secondary">Instant Quote</InstantQuoteButton>
            <CallButton variant="secondary" />
          </div>
          <div className="mt-6">
            <GoogleReviewsBadge variant="dark" size="sm" />
          </div>
        </div>
      </section>

      <section className="border-b border-black/[0.04] bg-white py-8 sm:py-10" aria-label="Trust badges">
        <div className="section-container">
          <ServiceTrustBadges />
        </div>
      </section>

      {/* Intro */}
      <section className="service-section bg-white" aria-labelledby={`${citySlug}-intro`}>
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <h2 id={`${citySlug}-intro`} className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              {sections.intro.title}
            </h2>
            <div className="service-prose mt-6">
              {sections.intro.paragraphs.map((p) => (
                <p key={p.slice(0, 48)}>{p}</p>
              ))}
            </div>
            <p className="mt-6 flex flex-col gap-2 text-[0.9375rem] sm:flex-row sm:flex-wrap sm:gap-x-6">
              <Link to="/services/window-cleaning" className="font-semibold text-royal-600 hover:text-royal-700">
                Full Window Cleaning service overview →
              </Link>
              <Link to={`/service-areas/${citySlug}`} className="font-semibold text-royal-600 hover:text-royal-700">
                All exterior cleaning in {cityName} →
              </Link>
            </p>
          </ScrollReveal>
        </div>
      </section>

      {sections.serviceDetails && (
        <section className="service-section bg-section-services" aria-labelledby={`${citySlug}-service-details`}>
          <div className="section-container max-w-3xl">
            <ScrollReveal>
              <h2 id={`${citySlug}-service-details`} className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
                {sections.serviceDetails.title}
              </h2>
              <div className="service-prose mt-6">
                {sections.serviceDetails.paragraphs.map((p) => (
                  <p key={p.slice(0, 48)}>{p}</p>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Local challenges */}
      <section className={`service-section ${sections.serviceDetails ? 'bg-white' : 'bg-section-services'}`} aria-labelledby={`${citySlug}-challenges`}>
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <h2 id={`${citySlug}-challenges`} className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              {sections.localChallenges.title}
            </h2>
            <div className="service-prose mt-6">
              {sections.localChallenges.paragraphs.map((p) => (
                <p key={p.slice(0, 48)}>{p}</p>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Neighborhoods */}
      <section className={`service-section ${sections.serviceDetails ? 'bg-section-services' : 'bg-white'}`} aria-labelledby={`${citySlug}-neighborhoods`}>
        <div className="section-container">
          <ScrollReveal className="section-header max-w-2xl">
            <h2 id={`${citySlug}-neighborhoods`} className="section-title">
              {sections.neighborhoods.title}
            </h2>
          </ScrollReveal>
          <div className="section-content grid gap-4 sm:grid-cols-2 lg:gap-5">
            {sections.neighborhoods.items.map((item, i) => (
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

      <section className={`service-section ${sections.serviceDetails ? 'bg-white' : 'bg-section-services'}`}>
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <ServiceCta
              headline={`Free Window Cleaning Estimate in ${cityName}`}
              text={`Every ${cityName} property is different — we walk your home, count windows, and quote transparently with no pressure.`}
            />
          </ScrollReveal>
        </div>
      </section>

      {/* Property types */}
      <section className={`service-section ${sections.serviceDetails ? 'bg-section-services' : 'bg-white'}`} aria-labelledby={`${citySlug}-properties`}>
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <h2 id={`${citySlug}-properties`} className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              {sections.propertyTypes.title}
            </h2>
            <div className="service-prose mt-6">
              {sections.propertyTypes.paragraphs.map((p) => (
                <p key={p.slice(0, 48)}>{p}</p>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Why local */}
      <section className="service-section bg-navy-900" aria-labelledby={`${citySlug}-why`}>
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <h2 id={`${citySlug}-why`} className="font-display text-2xl font-semibold text-white sm:text-3xl">
              {sections.whyLocal.title}
            </h2>
            <div className="mt-6 space-y-5 text-[1rem] leading-[1.75] text-white/60 sm:text-[1.0625rem]">
              {sections.whyLocal.paragraphs.map((p) => (
                <p key={p.slice(0, 48)}>{p}</p>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Related services */}
      <section className="service-section bg-section-services" aria-labelledby={`${citySlug}-related`}>
        <div className="section-container">
          <ScrollReveal className="section-header">
            <h2 id={`${citySlug}-related`} className="section-title">
              Related Services in {cityName}
            </h2>
            <p className="section-subtitle">
              Bundle exterior cleaning for a fully refreshed {cityName} property.
            </p>
          </ScrollReveal>
          <div className="section-content grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedServices.map((s, i) => (
              <ScrollReveal key={s.slug} stagger={i + 1}>
                <Link to={`/services/${s.slug}`} className="card group block p-6 hover:shadow-lg">
                  <h3 className="font-display text-lg font-semibold text-navy-900 group-hover:text-royal-700">
                    {s.serviceName}
                  </h3>
                  <p className="mt-2 text-[0.875rem] text-gray-500">{s.serviceName} in {cityName} →</p>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <RelatedProjects
        service="window-cleaning"
        city={citySlug}
        limit={3}
        heading={`Recent Window Cleaning Projects in ${cityName}`}
        subheading={`Published window cleaning jobs completed in ${cityName} — exact city and service match only.`}
        id={`${citySlug}-wc-projects`}
      />

      {/* FAQ */}
      <section className="service-section bg-section-faq" aria-labelledby={`${citySlug}-faq`}>
        <div className="section-container max-w-2xl">
          <ScrollReveal className="section-header">
            <p className="section-label">FAQ</p>
            <h2 id={`${citySlug}-faq`} className="section-title">
              {cityName} Window Cleaning Questions
            </h2>
          </ScrollReveal>
          <ScrollReveal className="section-content">
            <CityFaq faqs={faqs} />
          </ScrollReveal>
        </div>
      </section>

      <WindowCleaningCitiesNav currentSlug={citySlug} />

      {/* Final CTA */}
      <section className="service-section bg-navy-900 text-center" aria-labelledby={`${citySlug}-cta`}>
        <div className="section-container max-w-2xl">
          <ScrollReveal>
            <h2 id={`${citySlug}-cta`} className="font-display text-2xl font-semibold text-white sm:text-3xl">
              {cta.headline}
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/65 sm:text-base">{cta.text}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <BookOnlineButton variant="primary" />
              <InstantQuoteButton variant="secondary">Instant Quote</InstantQuoteButton>
              <CallButton variant="secondary" />
            </div>
            <p className="mt-6 text-sm text-white/45">
              {BUSINESS.name} · {county} · {cityName}, {state}
            </p>
          </ScrollReveal>
        </div>
      </section>
    </>
  )
}
