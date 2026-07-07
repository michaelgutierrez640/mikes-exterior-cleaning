import { Link } from 'react-router-dom'
import { PRIORITY_LOCATION_SLUGS, getLocationPage } from '../../content/cities/location'
import ScrollReveal from '../ScrollReveal'

export default function LocationLinks({ serviceName, variant = 'card' }) {
  const locations = PRIORITY_LOCATION_SLUGS.map((slug) => getLocationPage(slug)).filter(Boolean)

  if (variant === 'pills') {
    return (
      <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
        {locations.map((loc) => (
          <Link
            key={loc.citySlug}
            to={`/service-areas/${loc.citySlug}`}
            className="rounded-full border border-gray-200/80 bg-white px-4 py-2 text-[0.8125rem] font-semibold text-navy-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-royal-200 hover:bg-royal-50/60 hover:text-royal-700"
          >
            {loc.cityName}
          </Link>
        ))}
      </div>
    )
  }

  return (
    <section className="service-section bg-section-areas" aria-labelledby="location-links-heading">
      <div className="section-container">
        <ScrollReveal className="section-header max-w-2xl">
          <p className="section-label">Service Areas</p>
          <h2 id="location-links-heading" className="section-title">
            {serviceName ? `${serviceName} Near You` : 'Central Valley Service Areas'}
          </h2>
          <p className="section-subtitle">
            Local exterior cleaning pages with city-specific information, FAQs, and free estimates.
          </p>
        </ScrollReveal>
        <ScrollReveal className="section-content">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((loc) => (
              <Link
                key={loc.citySlug}
                to={`/service-areas/${loc.citySlug}`}
                className="card group p-6 transition-shadow hover:shadow-lg"
              >
                <h3 className="font-display text-lg font-semibold text-navy-900 group-hover:text-royal-700">
                  {serviceName ? `${serviceName} — ${loc.cityName}` : `Exterior Cleaning ${loc.cityName}`}
                </h3>
                <p className="mt-1 text-[0.8125rem] font-medium text-royal-600">{loc.county}</p>
                <p className="mt-3 text-[0.875rem] text-gray-500">View local page →</p>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-center">
            <Link to="/service-areas" className="text-[0.9375rem] font-semibold text-royal-600 hover:text-royal-700">
              View all service areas →
            </Link>
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
