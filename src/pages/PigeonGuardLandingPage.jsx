import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BUSINESS } from '../config/business'
import { absoluteUrl, DEFAULT_OG_IMAGE } from '../config/site'
import { getServicePageSchemas } from '../config/seo'
import { getServiceImage } from '../config/images'
import { getServicePageBySlug } from '../content/services'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import ScrollReveal from '../components/ScrollReveal'
import ResponsiveImage from '../components/ui/ResponsiveImage'
import { CallButton } from '../components/ui/Button'
import ServiceBreadcrumbs from '../components/service/ServiceBreadcrumbs'
import PigeonGuardEstimateForm from '../components/pigeon/PigeonGuardEstimateForm'
import {
  trackPigeonGuardCallClicked,
  trackPigeonGuardEstimateClicked,
  trackPigeonGuardPageView,
} from '../utils/analytics'
import { scrollToPigeonEstimateForm } from '../utils/scroll'

const HOW_IT_WORKS = [
  {
    title: 'Send your information',
    text: 'Share your property details and what you are seeing under or around the panels.',
  },
  {
    title: 'Mike reviews the panel layout',
    text: 'Your estimate request is reviewed against the array layout and access points you describe.',
  },
  {
    title: 'Receive an estimate',
    text: 'Get a clear pigeon guard estimate based on your panels and the problem you’re seeing.',
  },
  {
    title: 'Schedule installation',
    text: 'When you’re ready, schedule professional local installation around the panel perimeter.',
  },
]

const BENEFITS = [
  'Blocks access beneath panels',
  'Installed around the panel perimeter',
  'Helps prevent repeat nesting',
  'Professional local installation',
]

/** Landing-page sections: tighter than global .service-section, still breathable. */
const SECTION = 'py-8 sm:py-12 lg:py-14'
const BODY = 'text-[0.9375rem] leading-relaxed text-gray-700 sm:text-base sm:leading-[1.7]'

function EstimateCtaButton({
  className = '',
  children = 'Get My Free Pigeon Guard Estimate',
  sourceHint = 'pigeon_guard_estimate',
}) {
  return (
    <a
      href="#estimate-form"
      onClick={(e) => {
        trackPigeonGuardEstimateClicked(sourceHint)
        scrollToPigeonEstimateForm(e)
      }}
      className={`btn-royal btn-md group ${className}`}
    >
      {children}
      <svg
        className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-90 transition-transform duration-300 group-hover:translate-x-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </svg>
    </a>
  )
}

export default function PigeonGuardLandingPage() {
  const page = getServicePageBySlug('pigeon-guard')
  const { meta, hero, faqs, serviceName } = page
  const canonical = absoluteUrl('/services/pigeon-guard')
  const heroImage = getServiceImage('pigeon-guard')

  useEffect(() => {
    trackPigeonGuardPageView()
  }, [])

  const schemas = getServicePageSchemas({
    serviceName: 'Solar Panel Pigeon Guard',
    description: meta.description,
    slug: 'pigeon-guard',
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
      <JsonLd data={schemas} id="service-pigeon-guard" />

      {/* 1. Focused hero */}
      <section
        className="relative flex min-h-[64vh] items-end overflow-hidden bg-navy-950 sm:min-h-[70vh]"
        aria-labelledby="pigeon-hero-heading"
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
        <div className="absolute inset-0 bg-navy-950/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/50 to-navy-950/20" />

        <div className="section-container relative w-full pb-10 pt-28 sm:pb-14 sm:pt-32">
          <ServiceBreadcrumbs serviceName={serviceName} variant="dark" />
          <p className="mt-4 text-[0.75rem] font-semibold tracking-[0.18em] text-royal-200/90 uppercase sm:mt-5">
            Solar Panel Pigeon Guard · Bird Proofing
          </p>
          <h1
            id="pigeon-hero-heading"
            className="font-display mt-3 max-w-3xl text-[1.75rem] font-semibold leading-[1.12] text-white sm:text-4xl lg:text-[2.75rem]"
          >
            {hero.h1}
          </h1>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-white/85 sm:mt-4 sm:text-lg">
            {hero.subtitle}
          </p>
          <div
            id="pigeon-hero-ctas"
            className="mt-6 flex flex-wrap items-center gap-3 sm:mt-7 sm:gap-4"
          >
            <EstimateCtaButton className="!rounded-xl" sourceHint="pigeon_guard_hero_estimate" />
            <CallButton
              variant="secondary"
              className="!rounded-xl"
              sourceHint="pigeon_guard_hero_call"
              onClick={() => trackPigeonGuardCallClicked('pigeon_guard_hero_call')}
            >
              Call Mike
            </CallButton>
          </div>
        </div>
      </section>

      {/* 2. Problem */}
      <section className={`${SECTION} bg-white`} aria-labelledby="pigeon-problem">
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <h2 id="pigeon-problem" className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              Why pigeons under solar panels are a problem
            </h2>
            <div className={`mt-3 space-y-3 sm:mt-4 sm:space-y-4 ${BODY}`}>
              <p>
                Pigeons nest under rooftop solar panels. That brings droppings, noise, nesting debris, and mess onto
                the roof and around the array.
              </p>
              <p>
                Debris and droppings can stain surfaces and create cleanup headaches. A professionally installed pigeon
                barrier helps block birds from getting underneath your panels.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 3. Real proof + mid-page CTA */}
      <section className={`${SECTION} bg-section-services`} aria-labelledby="pigeon-proof">
        <div className="section-container max-w-4xl">
          <ScrollReveal className="max-w-2xl">
            <h2 id="pigeon-proof" className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              Real pigeon guard installation
            </h2>
            <p className={`mt-3 ${BODY}`}>
              A completed Solar Panel Pigeon Guard project from Mike&apos;s Exterior Cleaning — mesh installed along the
              panel perimeter to block nesting access.
            </p>
          </ScrollReveal>
          <ScrollReveal className="mt-5 sm:mt-6">
            <figure className="overflow-hidden rounded-[1.25rem]">
              <ResponsiveImage
                src={heroImage?.src ?? hero.image}
                webp={heroImage?.webp}
                srcSet={heroImage?.srcSet}
                alt={hero.imageAlt}
                className="aspect-[16/10] w-full object-cover"
                style={heroImage?.objectPosition ? { objectPosition: heroImage.objectPosition } : undefined}
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 896px"
              />
              <figcaption className="mt-2.5 text-[0.8125rem] text-gray-600">
                Pigeon guard mesh installed along solar panels on a residential roof.
              </figcaption>
            </figure>
          </ScrollReveal>
          <ScrollReveal className="mt-7 flex justify-center sm:mt-8">
            <EstimateCtaButton className="!rounded-xl !px-6" sourceHint="pigeon_guard_midpage_estimate" />
          </ScrollReveal>
        </div>
      </section>

      {/* 4. How it works */}
      <section className={`${SECTION} bg-white`} aria-labelledby="pigeon-how">
        <div className="section-container max-w-4xl">
          <ScrollReveal>
            <h2 id="pigeon-how" className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              How it works
            </h2>
            <ol className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
              {HOW_IT_WORKS.map((step, i) => (
                <li
                  key={step.title}
                  className="rounded-[1rem] border border-black/[0.06] bg-gray-50/80 p-5 sm:p-6"
                >
                  <div className="flex items-baseline gap-3">
                    <span
                      className="font-display text-lg font-semibold tabular-nums text-royal-700"
                      aria-hidden="true"
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-[1rem] font-semibold text-navy-900">{step.title}</h3>
                  </div>
                  <p className={`mt-2.5 ${BODY}`}>{step.text}</p>
                </li>
              ))}
            </ol>
          </ScrollReveal>
        </div>
      </section>

      {/* 5. Benefits */}
      <section className={`${SECTION} bg-section-services`} aria-labelledby="pigeon-benefits">
        <div className="section-container max-w-4xl">
          <ScrollReveal>
            <h2 id="pigeon-benefits" className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              What Solar Panel Pigeon Guard does
            </h2>
            <ul className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2">
              {BENEFITS.map((item) => (
                <li
                  key={item}
                  className="rounded-[1rem] border border-royal-100/80 bg-white px-5 py-4 text-[0.9375rem] font-medium leading-snug text-navy-900 shadow-[0_1px_2px_rgba(10,22,40,0.04)] sm:text-base"
                >
                  <span className="mr-2.5 inline-block h-1.5 w-1.5 rounded-full bg-royal-600 align-middle" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className={`mt-5 ${BODY}`}>
              Also need panels washed? See{' '}
              <Link to="/services/solar-panel-cleaning" className="font-semibold text-royal-700 underline underline-offset-2">
                Solar Panel Cleaning
              </Link>
              . Serving Modesto and the Central Valley —{' '}
              <Link to="/service-areas/modesto" className="font-semibold text-royal-700 underline underline-offset-2">
                Modesto service area
              </Link>
              .
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* 6. Estimate form — sticky CTA hides when submit is visible, so keep normal clearance */}
      <section
        id="estimate-form"
        className={`${SECTION} scroll-mt-24 bg-white pb-10 sm:pb-14 lg:pb-16`}
        aria-labelledby="pigeon-estimate"
      >
        <div className="section-container max-w-2xl">
          <ScrollReveal>
            <h2 id="pigeon-estimate" className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              Get your free pigeon guard estimate
            </h2>
            <p className={`mt-3 ${BODY}`}>
              Tell Mike what you&apos;re seeing under your solar panels — city, problems, and access notes help him
              prepare an accurate estimate.
            </p>
            <div className="mt-6 sm:mt-7">
              <PigeonGuardEstimateForm />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {faqs?.length > 0 && (
        <section
          className={`${SECTION} bg-section-faq pb-10 sm:pb-14 lg:pb-16`}
          aria-labelledby="pigeon-faq"
        >
          <div className="section-container max-w-2xl">
            <ScrollReveal>
              <h2 id="pigeon-faq" className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
                Pigeon Guard questions
              </h2>
              <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
                {faqs.map((faq) => (
                  <div key={faq.q}>
                    <h3 className="text-[1rem] font-semibold text-navy-900">{faq.q}</h3>
                    <p className={`mt-1.5 ${BODY}`}>{faq.a}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}
    </>
  )
}
