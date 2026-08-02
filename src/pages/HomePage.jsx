import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import Hero from '../components/sections/Hero'
import Services from '../components/sections/Services'
import MobileCTA from '../components/layout/MobileCTA'
import SectionDivider from '../components/ui/SectionDivider'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import { SEO, getHomePageSchemas } from '../config/seo'
import { FAQS } from '../config/content'
import { DEFAULT_OG_IMAGE } from '../config/site'
import { useGoogleReviews } from '../context/GoogleReviewsContext'
import { scrollToHash } from '../utils/scroll'

const Gallery = lazy(() => import('../components/sections/Gallery'))
const BeforeAfter = lazy(() => import('../components/sections/BeforeAfter'))
const Reviews = lazy(() => import('../components/sections/Reviews'))
const WhyChooseUs = lazy(() => import('../components/sections/WhyChooseUs'))
const ServiceAreas = lazy(() => import('../components/sections/ServiceAreas'))
const ServiceMap = lazy(() => import('../components/sections/ServiceMap'))
const FAQ = lazy(() => import('../components/sections/FAQ'))
const Contact = lazy(() => import('../components/sections/Contact'))
const BackToTop = lazy(() => import('../components/ui/BackToTop'))
const Particles = lazy(() => import('../components/ui/Particles'))

function SectionFallback({ className = 'bg-transparent' }) {
  return <div className={`min-h-[12rem] w-full ${className}`} aria-hidden="true" />
}

function DeferredParticles() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const start = () => setReady(true)
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start, { timeout: 2500 })
      return () => window.cancelIdleCallback?.(id)
    }
    const timer = window.setTimeout(start, 1200)
    return () => window.clearTimeout(timer)
  }, [])

  if (!ready) return null
  return (
    <Suspense fallback={null}>
      <Particles />
    </Suspense>
  )
}

export default function HomePage() {
  const { rating, reviewCount, reviewsUrl, reviews, businessName, fromApi } = useGoogleReviews()

  const reviewSummary = useMemo(
    () => ({
      rating,
      reviewCount,
      reviewsUrl,
      reviews,
      businessName,
    }),
    [rating, reviewCount, reviewsUrl, reviews, businessName],
  )

  const homeSchemas = useMemo(
    () => getHomePageSchemas(FAQS, reviewSummary),
    [reviewSummary],
  )

  useEffect(() => {
    if (window.location.hash) {
      requestAnimationFrame(() => scrollToHash(window.location.hash))
    }
  }, [])

  return (
    <>
      <SeoHead
        title={SEO.title}
        description={SEO.description}
        keywords={SEO.keywords}
        canonical={SEO.canonical}
        ogImage={DEFAULT_OG_IMAGE}
      />
      <JsonLd data={homeSchemas} id="home-schema" />
      <DeferredParticles />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Header />
      <main id="main-content" className="relative z-[1]">
        <Hero />
        <SectionDivider from="navy" to="gray" />
        <Services />
        <SectionDivider from="gray" to="white" />
        <Suspense fallback={<SectionFallback className="bg-section-gallery" />}>
          <Gallery />
        </Suspense>
        <SectionDivider from="white" to="navy" />
        <Suspense fallback={<SectionFallback className="bg-navy-900" />}>
          <BeforeAfter />
        </Suspense>
        <SectionDivider from="navy" to="reviews" />
        <Suspense fallback={<SectionFallback className="bg-section-reviews" />}>
          <Reviews />
        </Suspense>
        <SectionDivider from="reviews" to="navy" />
        <Suspense fallback={<SectionFallback className="bg-navy-900" />}>
          <WhyChooseUs />
        </Suspense>
        <SectionDivider from="navy" to="areas" />
        <Suspense fallback={<SectionFallback className="bg-section-areas" />}>
          <ServiceAreas />
        </Suspense>
        <SectionDivider from="areas" to="map" />
        <Suspense fallback={<SectionFallback className="bg-section-map" />}>
          <ServiceMap />
        </Suspense>
        <SectionDivider from="map" to="faq" />
        <Suspense fallback={<SectionFallback className="bg-section-faq" />}>
          <FAQ />
        </Suspense>
        <SectionDivider from="faq" to="navy" />
        <Suspense fallback={<SectionFallback className="bg-navy-900" />}>
          <Contact />
        </Suspense>
      </main>
      <Footer />
      <MobileCTA />
      <Suspense fallback={null}>
        <BackToTop />
      </Suspense>
      {fromApi && (
        <span className="sr-only" aria-live="polite">
          Google reviews updated from live data.
        </span>
      )}
    </>
  )
}
