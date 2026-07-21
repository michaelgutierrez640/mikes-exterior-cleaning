import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import NotFoundPage from './NotFoundPage'
import { BUSINESS } from '../config/business'
import { absoluteUrl, DEFAULT_OG_IMAGE } from '../config/site'
import { getServicePageSchemas } from '../config/seo'
import { getServiceEnhancements } from '../config/servicePageEnhancements'
import { getServiceImage } from '../config/images'
import { getServicePageBySlug, SERVICE_PAGES } from '../content/services'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import ScrollReveal from '../components/ScrollReveal'
import ResponsiveImage from '../components/ui/ResponsiveImage'
import { CallButton, QuoteButton, BookOnlineButton } from '../components/ui/Button'
import GoogleReviewsBadge from '../components/ui/GoogleReviewsBadge'
import ServiceBreadcrumbs from '../components/service/ServiceBreadcrumbs'
import ServiceCta from '../components/service/ServiceCta'
import ServiceTrustBadges from '../components/service/ServiceTrustBadges'
import ProcessTimeline from '../components/service/ProcessTimeline'
import DiyComparison from '../components/service/DiyComparison'
import WhyChooseMike from '../components/service/WhyChooseMike'
import ServiceChecklist from '../components/service/ServiceChecklist'
import MaintenanceTips from '../components/service/MaintenanceTips'
import ServiceBeforeAfter from '../components/service/ServiceBeforeAfter'
import ServiceTestimonials from '../components/service/ServiceTestimonials'
import AllServicesLinks from '../components/service/AllServicesLinks'
import RelatedServicesGrid from '../components/service/RelatedServicesGrid'
import WindowCleaningCitiesNav from '../components/service/WindowCleaningCitiesNav'
import LocationLinks from '../components/service/LocationLinks'
import ServiceRelatedArticles from '../components/service/ServiceRelatedArticles'
import RelatedProjects from '../components/projects/RelatedProjects'

function ServiceFaq({ faqs }) {
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

function ProseSection({ title, paragraphs, id, cta }) {
  if (!paragraphs?.length) return null
  return (
    <section className="service-section bg-white" aria-labelledby={id}>
      <div className="section-container max-w-3xl">
        <ScrollReveal>
          <h2 id={id} className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
            {title}
          </h2>
          <div className="service-prose mt-6">
            {paragraphs.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </div>
          {cta}
        </ScrollReveal>
      </div>
    </section>
  )
}

export default function ServicePage() {
  const { slug } = useParams()
  const page = getServicePageBySlug(slug)

  if (!page) {
    return <NotFoundPage />
  }

  const { meta, hero, sections, faqs, cta, serviceName } = page
  const canonical = absoluteUrl(`/services/${slug}`)
  const enhancements = getServiceEnhancements(slug)
  const heroImage = getServiceImage(slug)
  const otherServices = SERVICE_PAGES.filter((s) => s.slug !== slug)

  const schemas = getServicePageSchemas({
    serviceName,
    description: meta.description,
    slug,
    faqs,
  })

  return (
    <>
      <SeoHead
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        canonical={canonical}
        ogImage={DEFAULT_OG_IMAGE}
      />
      <JsonLd data={schemas} id={`service-${slug}`} />

      {/* Hero */}
      <section
        className="relative flex min-h-[48vh] items-end overflow-hidden bg-navy-950 sm:min-h-[54vh]"
        aria-labelledby="service-hero-heading"
      >
        <ResponsiveImage
          src={heroImage?.src ?? hero.image}
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
          <ServiceBreadcrumbs serviceName={serviceName} variant="dark" />
          <h1
            id="service-hero-heading"
            className="font-display mt-5 max-w-3xl text-[1.875rem] font-semibold leading-[1.14] text-white sm:mt-6 sm:text-4xl lg:text-[2.75rem]"
          >
            {hero.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-white/75 sm:mt-5 sm:text-lg">
            {hero.subtitle}
          </p>
          <div className="mt-7">
            <GoogleReviewsBadge variant="dark" size="sm" />
          </div>
        </div>
      </section>

      {/* Trust badges — above the fold */}
      <section className="border-b border-black/[0.04] bg-white py-8 sm:py-10" aria-label="Trust badges">
        <div className="section-container">
          <ServiceTrustBadges />
        </div>
      </section>

      <ProseSection
        id={`${slug}-intro`}
        title={sections.intro.title}
        paragraphs={sections.intro.paragraphs}
      />

      {/* Benefits */}
      <section className="service-section bg-section-services" aria-labelledby={`${slug}-benefits`}>
        <div className="section-container">
          <ScrollReveal className="section-header max-w-2xl">
            <h2 id={`${slug}-benefits`} className="section-title">{sections.benefits.title}</h2>
          </ScrollReveal>
          <div className="section-content grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {sections.benefits.items.map((item, i) => (
              <ScrollReveal key={item.title} stagger={i + 1}>
                <article className="glass-card h-full p-6 sm:p-7">
                  <h3 className="text-[1rem] font-semibold text-navy-900 sm:text-[1.0625rem]">{item.title}</h3>
                  <p className="mt-3 text-[0.9375rem] leading-[1.75] text-gray-600">{item.text}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
          <div className="mt-12 sm:mt-14">
            <ServiceCta
              headline="See the Difference on Your Property"
              text="Every property is different — get a free, no-pressure estimate tailored to your home or business."
            />
          </div>
        </div>
      </section>

      <ServiceBeforeAfter slug={slug} serviceName={serviceName} id={`${slug}-before-after`} />

      <ProcessTimeline
        id={`${slug}-timeline`}
        title={`${serviceName} in 5 Steps`}
        steps={sections.process.steps}
      />

      <DiyComparison data={enhancements?.diyComparison} id={`${slug}-diy`} />

      <ServiceChecklist data={enhancements?.checklist} id={`${slug}-checklist`} />

      <ProseSection
        id={`${slug}-why-pro`}
        title={sections.whyProfessional.title}
        paragraphs={sections.whyProfessional.paragraphs}
      />

      <WhyChooseMike
        id={`${slug}-why-mike`}
        blurb={enhancements?.whyChooseBlurb ?? BUSINESS.description}
        serviceName={serviceName}
      />

      <ServiceTestimonials slug={slug} serviceName={serviceName} id={`${slug}-testimonials`} />

      <AllServicesLinks currentSlug={slug} id={`${slug}-all-services`} />

      <ProseSection
        id={`${slug}-frequency`}
        title={sections.frequency.title}
        paragraphs={sections.frequency.paragraphs}
      />

      <MaintenanceTips data={enhancements?.maintenanceTips} id={`${slug}-maintenance`} />

      <ProseSection
        id={`${slug}-pricing`}
        title={sections.pricing.title}
        paragraphs={sections.pricing.paragraphs}
        cta={
          <ServiceCta
            compact
            headline="Request Your Free Estimate"
            text={`Call ${BUSINESS.phone} — transparent pricing with no surprise charges on the day of service.`}
          />
        }
      />

      <ProseSection
        id={`${slug}-areas`}
        title={sections.localAreas.title}
        paragraphs={sections.localAreas.paragraphs}
      />

      {slug === 'window-cleaning' && (
        <section className="service-section bg-white border-t border-black/[0.04]" aria-labelledby="wc-modesto-hub">
          <div className="section-container max-w-3xl text-center">
            <ScrollReveal>
              <h2 id="wc-modesto-hub" className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
                Window Cleaning in Modesto
              </h2>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-gray-600 sm:text-base">
                Modesto is our home market. For neighborhoods, local FAQs, and Modesto-specific window cleaning details,
                visit our dedicated Modesto page — then explore other Central Valley cities below.
              </p>
              <p className="mt-6">
                <Link
                  to="/window-cleaning/modesto"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-royal-600 px-5 text-[0.875rem] font-semibold text-white transition-colors hover:bg-royal-700"
                >
                  Modesto window cleaning →
                </Link>
              </p>
            </ScrollReveal>
          </div>
        </section>
      )}

      {slug === 'window-cleaning' && <WindowCleaningCitiesNav />}

      <LocationLinks serviceName={serviceName} />

      <RelatedProjects
        service={slug}
        limit={3}
        heading={`Recent ${serviceName} Projects`}
        subheading={`Published ${serviceName.toLowerCase()} jobs across our service area.`}
        id={`${slug}-projects`}
      />

      <ServiceRelatedArticles serviceSlug={slug} id={`${slug}-resources`} />

      <RelatedServicesGrid
        services={otherServices}
        currentSlug={slug}
        id={`${slug}-related`}
      />

      {/* FAQ */}
      <section className="service-section bg-section-faq" aria-labelledby={`${slug}-faq`}>
        <div className="section-container max-w-2xl">
          <ScrollReveal className="section-header">
            <p className="section-label">FAQ</p>
            <h2 id={`${slug}-faq`} className="section-title">
              {serviceName} Questions
            </h2>
          </ScrollReveal>
          <ScrollReveal className="section-content" delay="delay-100">
            <ServiceFaq faqs={faqs} />
          </ScrollReveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="service-section bg-navy-900" aria-labelledby={`${slug}-cta`}>
        <div className="section-container max-w-2xl text-center">
          <ScrollReveal>
            <h2 id={`${slug}-cta`} className="font-display text-2xl font-semibold text-white sm:text-3xl">
              {cta.headline}
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/65 sm:text-base">{cta.text}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <BookOnlineButton variant="primary" state={{ serviceSlug: slug }} />
              <QuoteButton variant="secondary" />
              <CallButton variant="secondary" />
            </div>
            <p className="mt-6 text-sm text-white/45">
              {BUSINESS.phone} · Free estimates · Licensed &amp; insured
            </p>
          </ScrollReveal>
        </div>
      </section>
    </>
  )
}
