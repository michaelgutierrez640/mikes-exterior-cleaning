import { Link } from 'react-router-dom'
import { SERVICE_PAGES } from '../../content/services'
import ScrollReveal from '../ScrollReveal'

export default function AllServicesLinks({ currentSlug, id }) {
  const services = SERVICE_PAGES.filter((s) => s.slug !== currentSlug)

  return (
    <section className="border-y border-black/[0.04] bg-gray-50/80 py-8 sm:py-10" aria-labelledby={id}>
      <div className="section-container">
        <ScrollReveal>
          <h2 id={id} className="text-center text-[0.6875rem] font-bold tracking-[0.2em] text-gray-500 uppercase sm:text-xs">
            All Exterior Cleaning Services
          </h2>
          <nav className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6" aria-label="All services">
            {services.map((service) => (
              <Link
                key={service.slug}
                to={`/services/${service.slug}`}
                className="text-[0.875rem] font-semibold text-royal-600 transition-colors hover:text-royal-700 sm:text-[0.9375rem]"
              >
                {service.serviceName}
              </Link>
            ))}
            <span className="hidden text-gray-300 sm:inline" aria-hidden="true">
              ·
            </span>
            <Link
              to="/service-areas"
              className="text-[0.875rem] font-semibold text-gray-600 transition-colors hover:text-navy-900 sm:text-[0.9375rem]"
            >
              Service Areas
            </Link>
          </nav>
        </ScrollReveal>
      </div>
    </section>
  )
}
