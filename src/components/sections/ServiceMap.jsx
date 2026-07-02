import { BUSINESS, MAP } from '../../config/business'
import ScrollReveal from '../ScrollReveal'

export default function ServiceMap() {
  return (
    <section id="service-area-map" className="section-padding relative bg-section-map" aria-labelledby="map-heading">
      <div className="section-container relative">
        <ScrollReveal className="section-header">
          <p className="section-label">Service Area</p>
          <h2 id="map-heading" className="section-title">
            Proudly Serving Modesto &amp; the Central Valley
          </h2>
          <p className="section-subtitle">
            Window cleaning, pressure washing, solar panel cleaning, and gutter cleaning
            for {BUSINESS.serviceAreas.join(', ')}.
          </p>
        </ScrollReveal>

        <ScrollReveal className="section-content" animation="reveal-scale">
          <div className="overflow-hidden rounded-[1.25rem] border border-black/[0.04] bg-white shadow-[0_4px_24px_rgba(10,22,40,0.06)]">
            <iframe
              title={MAP.title}
              src={MAP.embedUrl}
              className="h-[280px] w-full sm:h-[400px] lg:h-[440px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
