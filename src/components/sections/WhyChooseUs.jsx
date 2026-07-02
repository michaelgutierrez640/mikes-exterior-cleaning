import { getAboutImage } from '../../config/images'
import { WHY_CHOOSE } from '../../config/content'
import ScrollReveal from '../ScrollReveal'
import { WhyIcon } from '../ui/Icons'
import { QuoteButton } from '../ui/Button'
import ResponsiveImage from '../ui/ResponsiveImage'
import GoogleReviewsBadge from '../ui/GoogleReviewsBadge'

const aboutImage = getAboutImage()

export default function WhyChooseUs() {
  return (
    <section className="section-padding relative overflow-hidden bg-navy-900" aria-labelledby="why-heading">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,_rgba(37,99,235,0.07)_0%,_transparent_50%)]" aria-hidden="true" />

      <div className="section-container relative">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <ScrollReveal animation="reveal-left">
            <p className="text-[11px] font-semibold tracking-[0.28em] text-royal-400 uppercase">Why Choose Us</p>
            <h2 id="why-heading" className="section-title text-white">
              The Premium Choice in the Central Valley
            </h2>
            <p className="mt-5 text-[1.0625rem] leading-[1.7] text-white/55 sm:text-lg">
              Fully insured, professionally equipped, and trusted across the Central Valley.
              Every job includes a free estimate and our satisfaction guarantee.
            </p>

            <div className="mt-6">
              <GoogleReviewsBadge variant="dark" size="sm" link />
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
              <ResponsiveImage
                src={aboutImage.src}
                webp={aboutImage.webp}
                srcSet={aboutImage.srcSet}
                alt={aboutImage.alt}
                className="aspect-[4/3] w-full object-cover sm:aspect-[16/10]"
                style={{ objectPosition: aboutImage.objectPosition }}
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            <QuoteButton variant="primary" className="mt-8" />
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {WHY_CHOOSE.map((item, i) => (
              <ScrollReveal key={item.title} animation="reveal-scale" stagger={i + 1}>
                <div className="glass-dark group h-full rounded-[1rem] p-6 transition-transform duration-500 hover:-translate-y-0.5 sm:p-7">
                  <div className="icon-wrap mb-5 bg-royal-500/15 text-royal-300 transition-colors duration-300 group-hover:bg-royal-500/22">
                    <WhyIcon index={i} />
                  </div>
                  <h3 className="text-[0.9375rem] font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-[0.8125rem] leading-[1.6] text-white/50">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
