import ScrollReveal from '../ScrollReveal'

export default function MaintenanceTips({ data, id }) {
  if (!data?.tips?.length) return null

  return (
    <section className="service-section bg-section-faq" aria-labelledby={id}>
      <div className="section-container">
        <ScrollReveal className="section-header max-w-2xl">
          <p className="section-label">After Your Service</p>
          <h2 id={id} className="section-title">
            {data.title}
          </h2>
        </ScrollReveal>

        <div className="section-content grid gap-5 sm:grid-cols-2">
          {data.tips.map((tip, i) => (
            <ScrollReveal key={tip.title} stagger={i + 1}>
              <article className="glass-card h-full p-6 sm:p-7">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </div>
                <h3 className="mt-4 text-[1rem] font-semibold text-navy-900">{tip.title}</h3>
                <p className="mt-2.5 text-[0.9375rem] leading-[1.7] text-gray-600">{tip.text}</p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
