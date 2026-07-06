import ScrollReveal from '../ScrollReveal'

export default function ServiceChecklist({ data, id }) {
  if (!data?.items?.length) return null

  return (
    <section className="service-section bg-white" aria-labelledby={id}>
      <div className="section-container">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <ScrollReveal>
            <p className="section-label">Checklist</p>
            <h2 id={id} className="section-title mt-4 text-left">
              {data.title}
            </h2>
            <p className="mt-5 text-[0.9375rem] leading-[1.75] text-gray-600 sm:text-base">
              Every visit follows a consistent checklist so nothing gets missed — from protection and prep to final inspection.
            </p>
          </ScrollReveal>

          <ScrollReveal delay="delay-100">
            <ul className="grid gap-3 sm:gap-3.5">
              {data.items.map((item, i) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-[0.875rem] border border-black/[0.04] bg-gray-50/60 px-4 py-3.5 sm:px-5 sm:py-4"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-royal-600 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-[0.9375rem] leading-[1.6] text-navy-900">{item}</span>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
