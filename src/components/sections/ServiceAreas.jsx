import { Link } from 'react-router-dom'
import { SERVICE_CITIES } from '../../config/serviceAreas'
import { WINDOW_CLEANING_CITY_SLUGS } from '../../content/cities/window-cleaning'
import ScrollReveal from '../ScrollReveal'

export default function ServiceAreas() {
  return (
    <section id="service-areas" className="section-padding relative bg-section-areas" aria-labelledby="areas-heading">
      <div className="section-container relative">
        <ScrollReveal className="section-header">
          <p className="section-label">Service Areas</p>
          <h2 id="areas-heading" className="section-title">
            Proudly Serving the Central Valley
          </h2>
          <p className="section-subtitle">
            Window cleaning, pressure washing, solar panel cleaning, and gutter cleaning
            for Modesto, Salida, Riverbank, Oakdale, Ripon, Turlock, Ceres, Manteca, Tracy, and Stockton.
          </p>
        </ScrollReveal>

        <ScrollReveal className="section-content" delay="delay-100">
          <div className="card p-8 sm:p-10">
            <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
              {SERVICE_CITIES.map((area) => (
                <Link
                  key={area.slug}
                  to={`/service-areas/${area.slug}`}
                  className={
                    area.slug === 'modesto'
                      ? 'rounded-full border border-royal-300 bg-royal-50 px-5 py-2.5 text-[0.8125rem] font-semibold text-royal-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-royal-400 hover:bg-royal-100'
                      : 'rounded-full border border-gray-200/80 bg-white px-5 py-2.5 text-[0.8125rem] font-semibold text-navy-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-royal-200 hover:bg-royal-50/60 hover:text-royal-700'
                  }
                >
                  {area.slug === 'modesto' ? 'Modesto (home base)' : area.name}
                </Link>
              ))}
            </div>
            <p className="mt-8 text-center text-[0.9375rem] text-gray-500">
              <Link to="/service-areas/modesto" className="font-semibold text-royal-600 transition-colors hover:text-royal-700">
                Exterior cleaning in Modesto →
              </Link>
              <span className="mx-2 text-gray-300" aria-hidden="true">
                ·
              </span>
              <Link to="/service-areas" className="font-semibold text-royal-600 transition-colors hover:text-royal-700">
                View all service areas →
              </Link>
            </p>
            <div className="mt-10 border-t border-gray-100 pt-8">
              <p className="text-center text-[0.6875rem] font-bold tracking-[0.2em] text-gray-400 uppercase">
                Window Cleaning by City
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SERVICE_CITIES.filter((c) => WINDOW_CLEANING_CITY_SLUGS.includes(c.slug)).map((city) => (
                  <Link
                    key={city.slug}
                    to={`/window-cleaning/${city.slug}`}
                    className="rounded-full border border-royal-100 bg-royal-50/50 px-3.5 py-1.5 text-[0.75rem] font-semibold text-royal-700 transition-colors hover:bg-royal-100"
                  >
                    {city.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
