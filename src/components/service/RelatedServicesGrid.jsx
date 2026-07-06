import { Link } from 'react-router-dom'
import { BUSINESS } from '../../config/business'
import { getServiceImage } from '../../config/images'
import ScrollReveal from '../ScrollReveal'
import ResponsiveImage from '../ui/ResponsiveImage'

export default function RelatedServicesGrid({ services, currentSlug, id }) {
  if (!services?.length) return null

  return (
    <section className="service-section bg-section-services" aria-labelledby={id}>
      <div className="section-container">
        <ScrollReveal className="section-header">
          <h2 id={id} className="section-title">Related Services</h2>
          <p className="section-subtitle">
            Bundle services from {BUSINESS.shortName} for a fully refreshed exterior across Modesto and the Central Valley.
          </p>
        </ScrollReveal>

        <div className="section-content grid gap-5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
          {services.map((rel, i) => {
            const image = getServiceImage(rel.slug)
            return (
              <ScrollReveal key={rel.slug} stagger={i + 1}>
                <Link
                  to={`/services/${rel.slug}`}
                  className="card group flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg"
                >
                  {image && (
                    <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                      <ResponsiveImage
                        src={image.src}
                        webp={image.webp}
                        srcSet={image.srcSet}
                        alt={image.alt}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        style={{ objectPosition: image.objectPosition }}
                        loading="lazy"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="font-display text-lg font-semibold text-navy-900 group-hover:text-royal-700">
                      {rel.serviceName}
                    </h3>
                    <p className="mt-2 flex-1 text-[0.875rem] leading-relaxed text-gray-500">
                      {rel.meta.description.slice(0, 100)}…
                    </p>
                    <span className="mt-4 text-[0.875rem] font-semibold text-royal-600 group-hover:text-royal-700">
                      Learn more →
                    </span>
                  </div>
                </Link>
              </ScrollReveal>
            )
          })}
        </div>

        <p className="mt-10 text-center text-[0.9375rem] text-gray-500">
          Serving all of our{' '}
          <Link to="/service-areas" className="font-semibold text-royal-600 hover:text-royal-700">
            Central Valley service areas
          </Link>
          {currentSlug && (
            <>
              {' '}
              including{' '}
              <Link to="/service-areas/modesto" className="font-semibold text-royal-600 hover:text-royal-700">
                Modesto
              </Link>
              .
            </>
          )}
        </p>
      </div>
    </section>
  )
}
