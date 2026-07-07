import { Link } from 'react-router-dom'
import { getInstantQuotePageSeo, getOrganizationSchema, getWebSiteSchema, getBreadcrumbSchema } from '../config/seo'
import { absoluteUrl, DEFAULT_OG_IMAGE } from '../config/site'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import InstantQuoteCalculator from '../components/quote/InstantQuoteCalculator'
import ScrollReveal from '../components/ScrollReveal'
import { BUSINESS } from '../config/business'

const pageSeo = getInstantQuotePageSeo()

export default function InstantQuotePage() {
  const schemas = [
    getOrganizationSchema(),
    getWebSiteSchema(),
    getBreadcrumbSchema([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Instant Quote', url: pageSeo.canonical },
    ]),
  ]

  return (
    <>
      <SeoHead {...pageSeo} ogImage={DEFAULT_OG_IMAGE} />
      <JsonLd data={schemas} id="instant-quote-schema" />

      <section className="relative overflow-hidden bg-navy-950 pt-32 pb-16 sm:pb-20" aria-labelledby="quote-hero-heading">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900/90 to-royal-900/20" aria-hidden="true" />
        <div className="section-container relative">
          <nav className="mb-6 text-[0.8125rem] text-white/50" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white/80">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-white/80">Instant Quote</span>
          </nav>

          <ScrollReveal>
            <p className="section-label !text-royal-300">Free · No obligation</p>
            <h1 id="quote-hero-heading" className="font-display mt-4 max-w-2xl text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              Get Your Instant Quote in{' '}
              <span className="text-royal-300">Under 2 Minutes</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70">
              Select your services, answer a few quick questions, and see your estimated price range instantly.
              Serving {BUSINESS.serviceAreas.slice(0, 7).join(', ')}, and surrounding Central Valley communities.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="service-section bg-section-services pb-24 lg:pb-0" aria-label="Instant quote calculator">
        <div className="section-container">
          <div className="card p-6 sm:p-8 lg:p-10">
            <InstantQuoteCalculator />
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-white py-12 text-center">
        <div className="section-container max-w-xl">
          <p className="text-[0.8125rem] font-medium text-gray-400">Prefer to talk to someone?</p>
          <a
            href={BUSINESS.phoneHref}
            className="mt-2 inline-block font-display text-2xl font-semibold text-navy-900 transition-colors hover:text-royal-600"
          >
            {BUSINESS.phone}
          </a>
          <p className="mt-2 text-[0.8125rem] text-gray-400">Call for a free on-site estimate — no pressure, no obligation.</p>
        </div>
      </section>
    </>
  )
}
