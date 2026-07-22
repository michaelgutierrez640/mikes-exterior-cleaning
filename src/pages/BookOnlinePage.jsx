import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  getBookOnlinePageSchemas,
  getBookOnlinePageSeo,
  getBreadcrumbSchema,
  getOrganizationSchema,
  getWebSiteSchema,
} from '../config/seo'
import { absoluteUrl, DEFAULT_OG_IMAGE } from '../config/site'
import { BUSINESS } from '../config/business'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import ScrollReveal from '../components/ScrollReveal'
import BookingForm from '../components/booking/BookingForm'
import { PhoneLink } from '../components/ui/Button'
import { loadBookingPrefill, mergeBookingPrefill } from '../utils/bookingPrefill'

const pageSeo = getBookOnlinePageSeo()

export default function BookOnlinePage() {
  const location = useLocation()
  const prefill = useMemo(
    () => mergeBookingPrefill(location.state, loadBookingPrefill()),
    [location.state],
  )

  const schemas = [
    getOrganizationSchema(),
    getWebSiteSchema(),
    ...getBookOnlinePageSchemas(),
    getBreadcrumbSchema([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Book Online', url: pageSeo.canonical },
    ]),
  ]

  return (
    <>
      <SeoHead {...pageSeo} ogImage={DEFAULT_OG_IMAGE} />
      <JsonLd data={schemas} id="book-online-schema" />

      <section className="relative overflow-hidden bg-navy-950 pt-32 pb-16 sm:pb-20" aria-labelledby="book-hero-heading">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900/90 to-royal-900/20" aria-hidden="true" />
        <div className="section-container relative">
          <nav className="mb-6 text-[0.8125rem] text-white/50" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white/80">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-white/80">Book Online</span>
          </nav>

          <ScrollReveal>
            <p className="section-label !text-royal-300">Request appointment</p>
            <h1 id="book-hero-heading" className="font-display mt-4 max-w-2xl text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              Book Your{' '}
              <span className="text-royal-300">Exterior Cleaning</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70">
              Pick a preferred date and time window for window cleaning, pressure washing, gutter cleaning,
              or solar panel service in {BUSINESS.serviceAreas.slice(0, 5).join(', ')}, and the Central Valley.
              Mike personally confirms every request.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="service-section bg-section-services pb-24 lg:pb-16" aria-label="Book appointment form">
        <div className="section-container">
          <div className="card p-6 sm:p-8 lg:p-10">
            <BookingForm prefill={prefill} />
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-white py-12 text-center">
        <div className="section-container max-w-xl">
          <p className="text-[0.8125rem] font-medium text-gray-400">Need a price first?</p>
          <Link
            to="/instant-quote"
            className="mt-2 inline-block font-display text-xl font-semibold text-royal-600 transition-colors hover:text-royal-700"
          >
            Get an instant quote →
          </Link>
          <p className="mt-4 text-[0.8125rem] text-gray-400">
            Or call{' '}
            <PhoneLink sourceHint="book_online_page" className="font-medium text-navy-900 hover:text-royal-600">
              {BUSINESS.phone}
            </PhoneLink>
          </p>
        </div>
      </section>
    </>
  )
}
