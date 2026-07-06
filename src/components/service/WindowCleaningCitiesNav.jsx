import { Link } from 'react-router-dom'
import {
  WINDOW_CLEANING_CITY_PAGES,
  getOtherWindowCleaningCities,
} from '../../content/cities/window-cleaning'
import ScrollReveal from '../ScrollReveal'

export default function WindowCleaningCitiesNav({ currentSlug = null, variant = 'card' }) {
  const displayCities = currentSlug
    ? getOtherWindowCleaningCities(currentSlug)
    : WINDOW_CLEANING_CITY_PAGES

  if (variant === 'pills') {
    return (
      <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
        {displayCities.map((city) => (
          <Link
            key={city.citySlug}
            to={`/window-cleaning/${city.citySlug}`}
            className="rounded-full border border-gray-200/80 bg-white px-4 py-2 text-[0.8125rem] font-semibold text-navy-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-royal-200 hover:bg-royal-50/60 hover:text-royal-700"
          >
            {city.cityName}
          </Link>
        ))}
      </div>
    )
  }

  return (
    <section className="service-section bg-section-areas" aria-labelledby="wc-cities-nav">
      <div className="section-container">
        <ScrollReveal className="section-header max-w-2xl">
          <p className="section-label">Service Areas</p>
          <h2 id="wc-cities-nav" className="section-title">
            {currentSlug ? 'More Window Cleaning Cities' : 'Window Cleaning by City'}
          </h2>
          <p className="section-subtitle">
            Dedicated window cleaning pages for Central Valley communities — local expertise and free estimates on every page.
          </p>
        </ScrollReveal>
        <ScrollReveal className="section-content">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayCities.map((city) => (
              <Link
                key={city.citySlug}
                to={`/window-cleaning/${city.citySlug}`}
                className="card group p-6 transition-shadow hover:shadow-lg"
              >
                <h3 className="font-display text-lg font-semibold text-navy-900 group-hover:text-royal-700">
                  Window Cleaning {city.cityName}
                </h3>
                <p className="mt-1 text-[0.8125rem] font-medium text-royal-600">{city.county}</p>
                <p className="mt-3 text-[0.875rem] text-gray-500">View local info →</p>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-center">
            <Link
              to="/services/window-cleaning"
              className="text-[0.9375rem] font-semibold text-royal-600 hover:text-royal-700"
            >
              ← Full Window Cleaning Service Details
            </Link>
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
