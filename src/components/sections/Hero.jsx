import { BUSINESS, HERO_STATS } from '../../config/business'
import { getHeroImage } from '../../config/images'
import { useCountUp } from '../../hooks/useCountUp'
import ScrollReveal from '../ScrollReveal'
import TrustBar from '../ui/TrustBar'
import { CallButton, QuoteButton } from '../ui/Button'
import ResponsiveImage from '../ui/ResponsiveImage'
import { ImagePlaceholder } from '../ui/MediaAsset'
import { useEffect, useState } from 'react'

const heroImage = getHeroImage()

function HeroStat({ end, suffix, label, placeholder, delay = 0 }) {
  const { count, ref } = useCountUp(end ?? 0, 2000 + delay)
  const showPlaceholder = end == null && placeholder

  return (
    <div ref={showPlaceholder ? undefined : ref} className="text-center">
      <p className="font-display text-[1.75rem] font-semibold tabular-nums text-white sm:text-[2rem] lg:text-[2.25rem]">
        {showPlaceholder ? placeholder : `${count.toLocaleString()}${suffix}`}
      </p>
      <p className="mt-2 text-[10px] font-medium tracking-[0.14em] text-white/45 uppercase sm:text-[11px]">{label}</p>
    </div>
  )
}

function HeroBackground() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setLoaded(true)
    img.onerror = () => setLoaded(false)
    img.src = heroImage.webp || heroImage.src
  }, [])

  if (loaded) {
    return (
      <ResponsiveImage
        src={heroImage.src}
        webp={heroImage.webp}
        srcSet={heroImage.srcSet}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: heroImage.objectPosition }}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        sizes="100vw"
      />
    )
  }

  return (
    <>
      <div className="absolute inset-0 bg-[#060d1a]" aria-hidden="true" />
      <ImagePlaceholder
        layout="hero"
        title="Hero photo"
        file={heroImage.src}
        variant="dark"
      />
    </>
  )
}

export default function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden" aria-labelledby="hero-heading">
      <HeroBackground />
      <div className="absolute inset-0 bg-navy-950/55" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950/88 via-navy-900/65 to-navy-950/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/15 to-navy-950/35" />

      <div className="section-container relative pt-28 pb-24 sm:pt-32 sm:pb-28">
        <div className="max-w-3xl">
          <ScrollReveal>
            <TrustBar />
          </ScrollReveal>

          <ScrollReveal delay="delay-100">
            <h1 id="hero-heading" className="font-display mt-10 text-[2.125rem] font-semibold leading-[1.1] text-white sm:mt-12 sm:text-[3.25rem] lg:text-[3.75rem]">
              Crystal-Clear Windows.{' '}
              <span className="text-royal-300">Professional Exterior Cleaning.</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay="delay-200">
            <p className="mt-6 max-w-xl text-[1.0625rem] leading-[1.7] text-white/70 sm:mt-7 sm:text-lg">
              {BUSINESS.description}
            </p>
          </ScrollReveal>

          <ScrollReveal delay="delay-300">
            <div className="mt-9 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center">
              <CallButton className="w-full sm:w-auto" />
              <QuoteButton className="w-full sm:w-auto" />
            </div>
          </ScrollReveal>

          <ScrollReveal delay="delay-400">
            <a
              href={BUSINESS.phoneHref}
              className="mt-9 inline-flex w-full items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 backdrop-blur-2xl transition-[border-color,background-color] duration-300 hover:border-white/[0.14] hover:bg-white/[0.07] sm:mt-10 sm:w-auto"
            >
              <div className="icon-wrap-royal">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-[0.18em] text-white/40 uppercase">Call for a Free Estimate</p>
                <p className="mt-0.5 text-lg font-semibold text-white sm:text-xl">{BUSINESS.phone}</p>
              </div>
            </a>
          </ScrollReveal>

          <ScrollReveal delay="delay-500">
            <div className="mt-12 grid grid-cols-2 gap-8 border-t border-white/[0.08] pt-10 sm:mt-14 sm:grid-cols-4 sm:gap-6 sm:pt-12">
              {HERO_STATS.map((stat, i) => (
                <HeroStat
                  key={stat.label}
                  end={stat.end}
                  suffix={stat.suffix}
                  label={stat.label}
                  placeholder={stat.placeholder}
                  delay={i * 80}
                />
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
