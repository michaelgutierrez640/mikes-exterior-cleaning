import ScrollReveal from '../ScrollReveal'

export default function DiyComparison({ data, id }) {
  if (!data) return null

  return (
    <section className="service-section bg-section-services" aria-labelledby={id}>
      <div className="section-container">
        <ScrollReveal className="section-header max-w-2xl">
          <p className="section-label">Compare</p>
          <h2 id={id} className="section-title">
            {data.title}
          </h2>
          <p className="section-subtitle">{data.intro}</p>
        </ScrollReveal>

        <div className="section-content overflow-hidden rounded-[1.25rem] border border-black/[0.04] bg-white shadow-[0_4px_24px_rgba(10,22,40,0.05)]">
          <div className="grid grid-cols-2 border-b border-black/[0.06] bg-gray-50/80 text-center text-[0.6875rem] font-bold tracking-[0.15em] uppercase sm:text-xs">
            <div className="border-r border-black/[0.06] px-3 py-4 text-gray-500 sm:px-6">
              {data.diyTitle}
            </div>
            <div className="px-3 py-4 text-royal-700 sm:px-6">{data.proTitle}</div>
          </div>

          <ul>
            {data.rows.map((row, i) => (
              <li
                key={row.diy.slice(0, 40)}
                className={`grid grid-cols-2 ${i < data.rows.length - 1 ? 'border-b border-black/[0.04]' : ''}`}
              >
                <div className="flex gap-2.5 border-r border-black/[0.04] px-4 py-4 sm:gap-3 sm:px-6 sm:py-5">
                  <span className="mt-0.5 shrink-0 text-red-400" aria-hidden="true">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </span>
                  <p className="text-[0.8125rem] leading-[1.65] text-gray-600 sm:text-[0.9375rem]">{row.diy}</p>
                </div>
                <div className="flex gap-2.5 px-4 py-4 sm:gap-3 sm:px-6 sm:py-5">
                  <span className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </span>
                  <p className="text-[0.8125rem] leading-[1.65] text-navy-900 sm:text-[0.9375rem]">{row.pro}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
