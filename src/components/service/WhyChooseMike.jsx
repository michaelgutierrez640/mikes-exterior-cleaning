import { WHY_CHOOSE } from '../../config/content'
import { BUSINESS } from '../../config/business'
import ScrollReveal from '../ScrollReveal'
import { WhyIcon } from '../ui/Icons'
import GoogleReviewsBadge from '../ui/GoogleReviewsBadge'
import ServiceCta from './ServiceCta'

export default function WhyChooseMike({ blurb, serviceName, id }) {
  return (
    <section className="service-section relative overflow-hidden bg-navy-900" aria-labelledby={id}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,_rgba(37,99,235,0.07)_0%,_transparent_50%)]" aria-hidden="true" />

      <div className="section-container relative">
        <ScrollReveal className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-royal-400 uppercase">Why Choose Us</p>
          <h2 id={id} className="section-title mt-4 text-white">
            Why Choose {BUSINESS.name}
          </h2>
          <p className="mt-5 text-[1rem] leading-[1.75] text-white/55 sm:text-lg">
            {blurb}
          </p>
          <div className="mt-6">
            <GoogleReviewsBadge variant="dark" size="sm" link />
          </div>
        </ScrollReveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {WHY_CHOOSE.map((item, i) => (
            <ScrollReveal key={item.title} animation="reveal-scale" stagger={i + 1}>
              <div className="glass-dark group h-full rounded-[1rem] p-6 transition-transform duration-500 hover:-translate-y-0.5 sm:p-7">
                <div className="icon-wrap mb-5 bg-royal-500/15 text-royal-300 transition-colors duration-300 group-hover:bg-royal-500/22">
                  <WhyIcon index={i} />
                </div>
                <h3 className="text-[0.9375rem] font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-[0.8125rem] leading-[1.65] text-white/50">{item.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="mt-12">
          <ServiceCta
            variant="dark"
            headline={`Ready for Professional ${serviceName}?`}
            text="Free estimates across Modesto, Salida, Riverbank, Oakdale, Ripon, Turlock, Ceres, Manteca, Tracy, and Stockton."
          />
        </div>
      </div>
    </section>
  )
}
