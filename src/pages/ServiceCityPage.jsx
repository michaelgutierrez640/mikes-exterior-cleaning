import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import NotFoundPage from './NotFoundPage'
import { BUSINESS } from '../config/business'
import { getCityBySlug } from '../config/serviceAreas'
import { getServicePageBySlug } from '../content/services'
import { absoluteUrl, DEFAULT_OG_IMAGE } from '../config/site'
import {
  getBreadcrumbSchema,
  getFaqPageSchema,
  getLocalBusinessSchema,
  getOrganizationSchema,
  getServiceSchema,
} from '../config/seo'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import PublishedProjectsSection from '../components/projects/PublishedProjectsSection'
import { BookOnlineButton, InstantQuoteButton, CallButton } from '../components/ui/Button'
import { servicePath, cityPath } from '../utils/projectLabels'
import { normalizeCitySlug, normalizeServiceSlug } from '../utils/projectMatch'
import { buildServiceCityContent } from '../utils/serviceCityContent'

function ServiceCityFaq({ faqs, headingId, title }) {
  const [open, setOpen] = useState(0)
  if (!faqs?.length) return null
  return (
    <section className="service-section bg-section-faq" aria-labelledby={headingId}>
      <div className="section-container max-w-3xl">
        <h2 id={headingId} className="section-title">
          {title}
        </h2>
        <div className="mt-8 space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i
            return (
              <div key={faq.q} className="rounded-2xl border border-black/[0.06] bg-white">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <span className="font-semibold text-navy-900">{faq.q}</span>
                  <span className="text-royal-600" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen ? <p className="px-5 pb-5 text-[0.9375rem] leading-relaxed text-gray-600">{faq.a}</p> : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/**
 * Service × city landing page, e.g. /services/solar-panel-cleaning/patterson
 * Same generator for every supported city — local copy from city + location hub data.
 */
export default function ServiceCityPage() {
  const { slug: rawService, citySlug: rawCity } = useParams()
  const serviceSlug = normalizeServiceSlug(rawService)
  const citySlug = normalizeCitySlug(rawCity)
  const servicePage = getServicePageBySlug(serviceSlug)
  const city = getCityBySlug(citySlug)

  if (!servicePage || !city || serviceSlug !== servicePage.slug) {
    return <NotFoundPage />
  }

  const content = buildServiceCityContent(serviceSlug, city, servicePage)
  const path = `/services/${serviceSlug}/${citySlug}`
  const canonical = absoluteUrl(path)

  const schemas = [
    getOrganizationSchema(),
    getLocalBusinessSchema({
      areaServed: [{ '@type': 'City', name: `${content.cityName}, ${content.state}` }],
    }),
    getServiceSchema({
      name: `${content.serviceName} in ${content.cityName}`,
      description: content.description,
      areaServed: [{ '@type': 'City', name: `${content.cityName}, ${content.state}` }],
      url: canonical,
    }),
    getBreadcrumbSchema([
      { name: 'Home', url: absoluteUrl('/') },
      { name: content.serviceName, url: absoluteUrl(servicePath(serviceSlug)) },
      { name: `${content.serviceName} in ${content.cityName}`, url: canonical },
    ]),
    getFaqPageSchema(content.faqs),
  ]

  return (
    <>
      <SeoHead
        title={content.title}
        description={content.description}
        keywords={content.keywords}
        canonical={canonical}
        ogImage={servicePage.hero?.image ? absoluteUrl(servicePage.hero.image) : DEFAULT_OG_IMAGE}
      />
      <JsonLd data={schemas} id={`service-city-${serviceSlug}-${citySlug}`} />

      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-12 sm:pt-32 sm:pb-14">
        <div className="section-container max-w-3xl">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">
            {content.cityName}, {content.state} · {content.county}
          </p>
          <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">{content.h1}</h1>
          <p className="mt-4 text-[1rem] leading-relaxed text-white/65">{content.heroSubtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <CallButton variant="royal" />
            <InstantQuoteButton variant="secondary" size="md" className="!rounded-xl" />
            <BookOnlineButton variant="secondary" size="md" className="!rounded-xl" state={{ serviceSlug }} />
          </div>
        </div>
      </section>

      <section className="service-section bg-white" aria-labelledby={`${serviceSlug}-${citySlug}-intro`}>
        <div className="section-container max-w-3xl">
          <h2 id={`${serviceSlug}-${citySlug}-intro`} className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
            {content.introTitle}
          </h2>
          <div className="mt-5 space-y-4 text-[0.9375rem] leading-relaxed text-gray-600">
            {content.introParagraphs.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <PublishedProjectsSection
        service={serviceSlug}
        city={citySlug}
        limit={6}
        heading={`Recent ${content.serviceName} Projects in ${content.cityName}`}
        subheading={`Only published ${content.serviceName.toLowerCase()} jobs completed in ${content.cityName} — never unrelated cities or draft work.`}
        id={`${serviceSlug}-${citySlug}-projects`}
        className="service-section bg-section-services"
      />

      <ServiceCityFaq
        faqs={content.faqs}
        headingId={`${serviceSlug}-${citySlug}-faq`}
        title={`${content.cityName} ${content.serviceName} Questions`}
      />

      <section className="service-section bg-white">
        <div className="section-container max-w-3xl">
          <h2 className="font-display text-2xl font-semibold text-navy-900">
            More about {content.serviceName} and {content.cityName}
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-gray-600">
            Explore our full {content.serviceName.toLowerCase()} details, or see every exterior cleaning option we offer in{' '}
            {content.cityName}.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to={servicePath(serviceSlug)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 text-[0.875rem] font-semibold text-navy-900 ring-1 ring-black/[0.08]"
            >
              {content.serviceName} service page →
            </Link>
            <Link
              to={cityPath(citySlug)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 text-[0.875rem] font-semibold text-navy-900 ring-1 ring-black/[0.08]"
            >
              Exterior cleaning in {content.cityName} →
            </Link>
            {serviceSlug === 'window-cleaning' || serviceSlug === 'residential-window-cleaning' ? (
              <Link
                to={`/window-cleaning/${citySlug}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 text-[0.875rem] font-semibold text-navy-900 ring-1 ring-black/[0.08]"
              >
                Window cleaning guide for {content.cityName} →
              </Link>
            ) : null}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <CallButton variant="royal" />
            <InstantQuoteButton variant="secondary" size="md" className="!rounded-xl" showIcon={false} />
          </div>
        </div>
      </section>
    </>
  )
}
