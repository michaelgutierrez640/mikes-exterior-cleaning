import { BUSINESS } from '../../config/business'
import ScrollReveal from '../ScrollReveal'

export default function ServiceAreas() {
  return (
    <section className="section-padding relative bg-section-areas" aria-labelledby="areas-heading">
      <div className="section-container relative">
        <ScrollReveal className="section-header">
          <p className="section-label">Service Areas</p>
          <h2 id="areas-heading" className="section-title">
            Proudly Serving the Central Valley
          </h2>
          <p className="section-subtitle">
            Window cleaning, pressure washing, solar panel cleaning, and gutter cleaning
            for Modesto, Manteca, Riverbank, Turlock, Salida, and Ripon.
          </p>
        </ScrollReveal>

        <ScrollReveal className="section-content" delay="delay-100">
          <div className="card p-8 sm:p-10">
            <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
              {BUSINESS.serviceAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-gray-200/80 bg-white px-5 py-2.5 text-[0.8125rem] font-semibold text-navy-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-royal-200 hover:bg-royal-50/60 hover:text-royal-700"
                >
                  {area}
                </span>
              ))}
            </div>
            <p className="mt-8 text-center text-[0.9375rem] text-gray-500">
              Don&apos;t see your area?{' '}
              <a href="#contact" className="font-semibold text-royal-600 transition-colors hover:text-royal-700">
                Contact us
              </a>
              {' '}— we may still be able to help.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
