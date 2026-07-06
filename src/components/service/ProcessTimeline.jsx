import ScrollReveal from '../ScrollReveal'

export default function ProcessTimeline({ title, steps, id }) {
  const timelineSteps = steps.slice(0, 5)

  return (
    <section className="service-section bg-white" aria-labelledby={id}>
      <div className="section-container">
        <ScrollReveal className="section-header max-w-2xl">
          <p className="section-label">Our Process</p>
          <h2 id={id} className="section-title">
            {title}
          </h2>
          <p className="section-subtitle">
            Five clear steps from your free estimate to a final walkthrough — no surprises, no shortcuts.
          </p>
        </ScrollReveal>

        <div className="section-content relative mx-auto max-w-3xl">
          <div className="absolute top-8 bottom-8 left-5 hidden w-px bg-gradient-to-b from-royal-200 via-royal-300 to-royal-200 sm:left-6 sm:block" aria-hidden="true" />

          <ol className="space-y-6 sm:space-y-8">
            {timelineSteps.map((step, i) => (
              <ScrollReveal key={step.title} stagger={i + 1}>
                <li className="relative flex gap-4 sm:gap-6">
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-royal-600 text-sm font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] sm:h-12 sm:w-12 sm:text-base">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1 rounded-[1rem] border border-black/[0.04] bg-gray-50/80 p-5 sm:p-6">
                    <p className="text-[10px] font-bold tracking-[0.2em] text-royal-600 uppercase">
                      Step {i + 1}
                    </p>
                    <h3 className="mt-1.5 text-[1rem] font-semibold text-navy-900 sm:text-[1.0625rem]">
                      {step.title}
                    </h3>
                    <p className="mt-2.5 text-[0.9375rem] leading-[1.75] text-gray-600">{step.text}</p>
                  </div>
                </li>
              </ScrollReveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
