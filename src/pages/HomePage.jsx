import { useEffect } from 'react'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import Hero from '../components/sections/Hero'
import Services from '../components/sections/Services'
import Gallery from '../components/sections/Gallery'
import BeforeAfter from '../components/sections/BeforeAfter'
import Reviews from '../components/sections/Reviews'
import WhyChooseUs from '../components/sections/WhyChooseUs'
import ServiceAreas from '../components/sections/ServiceAreas'
import ServiceMap from '../components/sections/ServiceMap'
import FAQ from '../components/sections/FAQ'
import Contact from '../components/sections/Contact'
import MobileCTA from '../components/layout/MobileCTA'
import Particles from '../components/ui/Particles'
import SectionDivider from '../components/ui/SectionDivider'
import BackToTop from '../components/ui/BackToTop'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import { SEO, getHomePageSchemas } from '../config/seo'
import { FAQS } from '../config/content'
import { DEFAULT_OG_IMAGE } from '../config/site'

import { scrollToHash } from '../utils/scroll'

export default function HomePage() {
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
      <JsonLd data={getHomePageSchemas(FAQS)} id="home-schema" />
      <Particles />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Header />
      <main id="main-content" className="relative z-[1]">
        <Hero />
        <SectionDivider from="navy" to="gray" />
        <Services />
        <SectionDivider from="gray" to="white" />
        <Gallery />
        <SectionDivider from="white" to="navy" />
        <BeforeAfter />
        <SectionDivider from="navy" to="reviews" />
        <Reviews />
        <SectionDivider from="reviews" to="navy" />
        <WhyChooseUs />
        <SectionDivider from="navy" to="areas" />
        <ServiceAreas />
        <SectionDivider from="areas" to="map" />
        <ServiceMap />
        <SectionDivider from="map" to="faq" />
        <FAQ />
        <SectionDivider from="faq" to="navy" />
        <Contact />
      </main>
      <Footer />
      <MobileCTA />
      <BackToTop />
    </>
  )
}
