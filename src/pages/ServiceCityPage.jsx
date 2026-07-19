import { Link, useParams } from 'react-router-dom'
import NotFoundPage from './NotFoundPage'
import { BUSINESS } from '../config/business'
import { getCityBySlug } from '../config/serviceAreas'
import { getServicePageBySlug } from '../content/services'
import { absoluteUrl, DEFAULT_OG_IMAGE } from '../config/site'
import { getBreadcrumbSchema, getLocalBusinessSchema, getOrganizationSchema } from '../config/seo'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import PublishedProjectsSection from '../components/projects/PublishedProjectsSection'
import { BookOnlineButton, InstantQuoteButton, CallButton } from '../components/ui/Button'
import { cityLabel, serviceLabel, servicePath, cityPath } from '../utils/projectLabels'
import { normalizeCitySlug, normalizeServiceSlug } from '../utils/projectMatch'

/**
 * Thin service × city landing page, e.g. /services/solar-panel-cleaning/manteca
 * Hosts matching published projects for local SEO.
 */
export default function ServiceCityPage() {
  const { slug: rawService, citySlug: rawCity } = useParams()
  const serviceSlug = normalizeServiceSlug(rawService)
  const citySlug = normalizeCitySlug(rawCity)
  const servicePage = getServicePageBySlug(serviceSlug)
  const city = getCityBySlug(citySlug)

  if (!servicePage || !city) {
    return <NotFoundPage />
  }

  const serviceName = servicePage.serviceName || serviceLabel(serviceSlug)
  const cityName = city.name || cityLabel(citySlug)
  const path = `/services/${serviceSlug}/${citySlug}`
  const canonical = absoluteUrl(path)
  const title = `${serviceName} in ${cityName} CA | ${BUSINESS.shortName || "Mike's Exterior"}`
  const description =
    servicePage.meta?.description ||
    `Professional ${serviceName.toLowerCase()} in ${cityName}, CA. See recent completed projects and get a free Instant Quote from ${BUSINESS.name}.`

  const schemas = [
    getOrganizationSchema(),
    getLocalBusinessSchema({
      areaServed: [{ '@type': 'City', name: `${cityName}, ${city.state || 'CA'}` }],
    }),
    getBreadcrumbSchema([
      { name: 'Home', url: absoluteUrl('/') },
      { name: serviceName, url: absoluteUrl(servicePath(serviceSlug)) },
      { name: `${serviceName} in ${cityName}`, url: canonical },
    ]),
  ]

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        keywords={`${serviceName}, ${cityName}, ${cityName} CA, completed projects`}
        canonical={canonical}
        ogImage={servicePage.hero?.image ? absoluteUrl(servicePage.hero.image) : DEFAULT_OG_IMAGE}
      />
      <JsonLd data={schemas} id={`service-city-${serviceSlug}-${citySlug}`} />

      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-12 sm:pt-32 sm:pb-14">
        <div className="section-container max-w-3xl">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">
            {cityName}, {city.state || 'CA'}
          </p>
          <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">
            {serviceName} in {cityName}
          </h1>
          <p className="mt-4 text-[1rem] leading-relaxed text-white/65">
            Local {serviceName.toLowerCase()} for {cityName} homes and businesses — see recent published work below, then
            request a free Instant Quote.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <InstantQuoteButton variant="royal" size="md" className="!rounded-xl" />
            <BookOnlineButton variant="secondary" size="md" className="!rounded-xl" state={{ serviceSlug }} />
          </div>
        </div>
      </section>

      <PublishedProjectsSection
        service={serviceSlug}
        city={citySlug}
        limit={6}
        heading={`Recent ${serviceName} Projects in ${cityName}`}
        subheading={`Published ${serviceName.toLowerCase()} jobs completed in ${cityName}.`}
        id={`${serviceSlug}-${citySlug}-projects`}
        className="service-section bg-white"
      />

      <section className="service-section bg-section-services">
        <div className="section-container max-w-3xl">
          <h2 className="font-display text-2xl font-semibold text-navy-900">
            More about {serviceName} and {cityName}
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-gray-600">
            Explore our full {serviceName.toLowerCase()} service details, or see all exterior cleaning options we offer in{' '}
            {cityName}.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to={servicePath(serviceSlug)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 text-[0.875rem] font-semibold text-navy-900 ring-1 ring-black/[0.08]"
            >
              {serviceName} service page →
            </Link>
            <Link
              to={cityPath(citySlug)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 text-[0.875rem] font-semibold text-navy-900 ring-1 ring-black/[0.08]"
            >
              Exterior cleaning in {cityName} →
            </Link>
            {serviceSlug === 'window-cleaning' || serviceSlug === 'residential-window-cleaning' ? (
              <Link
                to={`/window-cleaning/${citySlug}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 text-[0.875rem] font-semibold text-navy-900 ring-1 ring-black/[0.08]"
              >
                Window cleaning in {cityName} →
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
