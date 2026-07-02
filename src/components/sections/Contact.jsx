import { BUSINESS } from '../../config/business'
import { getLogoImage } from '../../config/images'
import ContactForm from '../ContactForm'
import ScrollReveal from '../ScrollReveal'
import ResponsiveImage from '../ui/ResponsiveImage'

const logoImage = getLogoImage()

export default function Contact() {
  return (
    <section id="contact" className="section-padding relative scroll-mt-20 overflow-hidden bg-navy-950" aria-labelledby="contact-heading">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_100%,_rgba(37,99,235,0.1)_0%,_transparent_55%)]" aria-hidden="true" />

      <div className="section-container relative">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <ScrollReveal animation="reveal-left">
            <div className="flex items-start gap-4">
              <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white p-3 sm:h-20 sm:w-20 sm:p-4">
                <ResponsiveImage
                  src={logoImage.src}
                  webp={logoImage.webp}
                  srcSet={logoImage.srcSet}
                  alt={logoImage.alt}
                  className="max-h-full max-w-full object-contain"
                  loading="eager"
                  sizes="80px"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.28em] text-royal-400 uppercase">Get In Touch</p>
                <h2 id="contact-heading" className="section-title mt-3 text-white">
                  Request Your Free Quote
                </h2>
              </div>
            </div>

            <p className="mt-6 text-[1.0625rem] leading-[1.7] text-white/55 sm:mt-7">
              Ready to transform your property? Fill out the form and we&apos;ll respond within
              24 hours with your personalized free quote.
            </p>

            <div className="mt-8 space-y-3 sm:mt-10">
              <a
                href={BUSINESS.phoneHref}
                className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition-[border-color,background-color] duration-300 hover:border-white/[0.1] hover:bg-white/[0.05]"
              >
                <div className="icon-wrap bg-royal-600/15 text-royal-300">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[0.75rem] font-medium text-white/40">Call Us Directly</p>
                  <p className="mt-0.5 text-[1.0625rem] font-semibold text-white">{BUSINESS.phone}</p>
                </div>
              </a>
              <a
                href={BUSINESS.emailHref}
                className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition-[border-color,background-color] duration-300 hover:border-white/[0.1] hover:bg-white/[0.05]"
              >
                <div className="icon-wrap bg-royal-600/15 text-royal-300">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.75rem] font-medium text-white/40">Email Us</p>
                  <p className="mt-0.5 text-[0.9375rem] font-semibold break-all text-white">{BUSINESS.email}</p>
                </div>
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="reveal-right" delay="delay-150">
            <ContactForm />
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
