import { getBeforeAfterSets } from '../../config/images'
import BeforeAfterSlider from '../BeforeAfterSlider'
import ScrollReveal from '../ScrollReveal'
import { QuoteButton } from '../ui/Button'

const beforeAfterSets = getBeforeAfterSets()

export default function BeforeAfter() {
  if (!beforeAfterSets.length) return null

  return (
    <section id="results" className="section-padding relative overflow-hidden bg-navy-900" aria-labelledby="results-heading">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,_rgba(37,99,235,0.08)_0%,_transparent_50%)]" aria-hidden="true" />

      <div className="section-container relative">
        <ScrollReveal className="section-header" animation="reveal-fade">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-royal-400 uppercase">Real Results</p>
          <h2 id="results-heading" className="section-title text-white">
            See the Transformation
          </h2>
          <p className="section-subtitle text-white/55">
            Drag or swipe the slider to reveal the difference our professional cleaning makes.
          </p>
        </ScrollReveal>

        <div className="section-content grid gap-6 sm:grid-cols-2 lg:gap-8">
          {beforeAfterSets.map((item, i) => (
            <ScrollReveal key={item.id} animation={i === 0 ? 'reveal-left' : 'reveal-right'} stagger={i + 1}>
              <BeforeAfterSlider
                label={item.label}
                before={item.before}
                after={item.after}
                beforeWebp={item.beforeWebp}
                afterWebp={item.afterWebp}
                beforeSrcSet={item.beforeSrcSet}
                afterSrcSet={item.afterSrcSet}
                aspectClass={item.aspectClass}
              />
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="mt-14 text-center sm:mt-16" delay="delay-200">
          <QuoteButton variant="royal" />
        </ScrollReveal>
      </div>
    </section>
  )
}
