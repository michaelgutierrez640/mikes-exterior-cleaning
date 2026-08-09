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
  trackPigeonGuardPageView,
} from '../utils/analytics'
import { scrollToPigeonEstimateForm } from '../utils/scroll'

const HOW_IT_WORKS = [
  {
    title: 'Send your information and photos',
    text: 'Share your property details and optional photos of the roof, panels, nesting, or debris.',
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

function EstimateCtaButton({ className = '', children = 'Get My Free Pigeon Guard Estimate' }) {
  return (
    <a
      href="#estimate-form"
      onClick={scrollToPigeonEstimateForm}
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
        className="relative flex min-h-[72vh] items-end overflow-hidden bg-navy-950 sm:min-h-[78vh]"
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

        <div className="section-container relative w-full pb-12 pt-28 sm:pb-16 sm:pt-32">
          <ServiceBreadcrumbs serviceName={serviceName} variant="dark" />
          <p className="mt-5 text-[0.75rem] font-semibold tracking-[0.18em] text-royal-200/90 uppercase sm:mt-6">
            Solar Panel Pigeon Guard · Bird Proofing
          </p>
          <h1
            id="pigeon-hero-heading"
            className="font-display mt-3 max-w-3xl text-[1.875rem] font-semibold leading-[1.12] text-white sm:text-4xl lg:text-[2.75rem]"
          >
            {hero.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-white/78 sm:mt-5 sm:text-lg">
            {hero.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
            <EstimateCtaButton className="!rounded-xl" />
            <CallButton
              variant="secondary"
              className="!rounded-xl"
              sourceHint="pigeon_guard_landing"
              onClick={() => trackPigeonGuardCallClicked('pigeon_guard_hero')}
            >
              Call Mike
            </CallButton>
          </div>
        </div>
      </section>

      {/* 2. Problem */}
      <section className="service-section bg-white" aria-labelledby="pigeon-problem">
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <h2 id="pigeon-problem" className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              Why pigeons under solar panels are a problem
            </h2>
            <div className="service-prose mt-6">
              <p>
                Pigeons nest in the sheltered gap beneath rooftop solar panels. Nesting brings droppings, noise,
                nesting debris, and mess onto the roof and around the array.
              </p>
              <p>
                Over time, debris and droppings can stain surfaces, create cleanup headaches, and contribute to wear
                around mounts and roofing materials. Bird proofing with a professionally installed pigeon barrier helps
                block birds from getting underneath your panels in the first place.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 3. Real proof */}
      <section className="service-section bg-section-services" aria-labelledby="pigeon-proof">
        <div className="section-container">
          <ScrollReveal className="section-header max-w-2xl">
            <h2 id="pigeon-proof" className="section-title">
              Real pigeon guard installation
            </h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-gray-600">
              A completed Solar Panel Pigeon Guard project from Mike&apos;s Exterior Cleaning — mesh installed along the
              panel perimeter to block nesting access.
            </p>
          </ScrollReveal>
          <ScrollReveal className="section-content mt-8">
            <figure className="overflow-hidden rounded-[1.25rem]">
              <ResponsiveImage
                src={heroImage?.src ?? hero.image}
                webp={heroImage?.webp}
                srcSet={heroImage?.srcSet}
                alt={hero.imageAlt}
                className="aspect-[16/10] w-full object-cover"
                style={heroImage?.objectPosition ? { objectPosition: heroImage.objectPosition } : undefined}
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 960px"
              />
              <figcaption className="mt-3 text-[0.8125rem] text-gray-500">
                Pigeon guard mesh installed along solar panels on a residential roof.
              </figcaption>
            </figure>
          </ScrollReveal>
        </div>
      </section>

      {/* 4. How it works */}
      <section className="service-section bg-white" aria-labelledby="pigeon-how">
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <h2 id="pigeon-how" className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              How it works
            </h2>
            <ol className="mt-8 space-y-5">
              {HOW_IT_WORKS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-royal-50 text-[0.875rem] font-semibold text-royal-800"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[1rem] font-semibold text-navy-900">{step.title}</h3>
                    <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-gray-600">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </ScrollReveal>
        </div>
      </section>

      {/* 5. Benefits */}
      <section className="service-section bg-section-services" aria-labelledby="pigeon-benefits">
        <div className="section-container max-w-3xl">
          <ScrollReveal>
            <h2 id="pigeon-benefits" className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              What Solar Panel Pigeon Guard does
            </h2>
            <ul className="mt-8 space-y-3">
              {BENEFITS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-[0.9375rem] leading-relaxed text-gray-700 sm:text-base"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-royal-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[0.9375rem] leading-relaxed text-gray-600">
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

      {/* 6. Estimate form */}
      <section
        id="estimate-form"
        className="service-section scroll-mt-24 bg-white pb-28 lg:pb-16"
        aria-labelledby="pigeon-estimate"
      >
        <div className="section-container max-w-2xl">
          <ScrollReveal>
            <h2 id="pigeon-estimate" className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              Get your free pigeon guard estimate
            </h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-gray-600">
              Tell Mike what you&apos;re seeing under your solar panels. Photos help when you have them — they&apos;re
              optional.
            </p>
            <div className="mt-8">
              <PigeonGuardEstimateForm />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {faqs?.length > 0 && (
        <section className="service-section bg-section-faq" aria-labelledby="pigeon-faq">
          <div className="section-container max-w-2xl">
            <ScrollReveal>
              <h2 id="pigeon-faq" className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
                Pigeon Guard questions
              </h2>
              <div className="mt-8 space-y-5">
                {faqs.map((faq) => (
                  <div key={faq.q}>
                    <h3 className="text-[1rem] font-semibold text-navy-900">{faq.q}</h3>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-gray-600">{faq.a}</p>
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
