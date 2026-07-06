import { Link } from 'react-router-dom'
import { SERVICES } from '../../config/content'
import { getServiceImage } from '../../config/images'
import ScrollReveal from '../ScrollReveal'
import ResponsiveImage from '../ui/ResponsiveImage'

export default function Services() {
  return (
    <section id="services" className="section-padding relative bg-section-services" aria-labelledby="services-heading">
      <div className="section-container relative">
        <ScrollReveal className="section-header">
          <p className="section-label">Our Services</p>
          <h2 id="services-heading" className="section-title">
            Premium Care for Every Surface
          </h2>
          <p className="section-subtitle">
            Professional exterior cleaning for homes and businesses across Modesto, Salida, Riverbank,
            Oakdale, Ripon, Turlock, Ceres, Manteca, Tracy, and Stockton.
          </p>
        </ScrollReveal>

        <div className="section-content grid gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {SERVICES.map((service, i) => {
            const photo = getServiceImage(service.slug)
            return (
              <ScrollReveal key={service.slug} stagger={i + 1}>
                <article className="card group h-full overflow-hidden p-0">
                  {photo && (
                    <Link to={`/services/${service.slug}`} className="relative block aspect-[16/10] overflow-hidden">
                      <ResponsiveImage
                        src={photo.src}
                        webp={photo.webp}
                        srcSet={photo.srcSet}
                        alt={photo.alt}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        style={{ objectPosition: photo.objectPosition }}
                        loading="lazy"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-transparent" />
                    </Link>
                  )}
                  <div className="p-7 sm:p-8">
                    <h3 className="font-display text-xl font-semibold text-navy-900">
                      <Link to={`/services/${service.slug}`} className="transition-colors hover:text-royal-700">
                        {service.title}
                      </Link>
                    </h3>
                    <p className="mt-3 text-[0.9375rem] leading-[1.65] text-gray-500">{service.description}</p>
                    <Link
                      to={`/services/${service.slug}`}
                      className="group/link mt-6 inline-flex min-h-[44px] items-center gap-1.5 text-[0.875rem] font-semibold text-royal-600 transition-colors duration-300 hover:text-royal-700"
                    >
                      Learn More
                      <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover/link:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </div>
                </article>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
