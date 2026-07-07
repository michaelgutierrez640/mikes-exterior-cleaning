import { formatCurrency } from '../../utils/quotePricing'

export default function QuoteSummary({ quote, selectedServices, compact = false }) {
  const hasEstimate = quote.lineItems.length > 0

  return (
    <div
      className={`rounded-2xl border transition-all duration-500 ${
        compact
          ? 'border-gray-200/80 bg-white p-5'
          : 'border-royal-200/60 bg-gradient-to-br from-navy-900 via-navy-900 to-navy-800 p-6 text-white shadow-[0_16px_48px_rgba(10,22,40,0.2)] sm:p-7'
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className={`font-display text-lg font-semibold ${compact ? 'text-navy-900' : 'text-white'}`}>
          Your Estimate
        </h3>
        {quote.bundleDiscount > 0 && (
          <span className={`pill text-[0.6875rem] ${compact ? 'border-royal-200 bg-royal-50 text-royal-700' : 'pill-amber'}`}>
            10% bundle savings
          </span>
        )}
      </div>

      {hasEstimate ? (
        <>
          <p className={`mt-4 font-display text-3xl font-semibold tabular-nums sm:text-4xl ${compact ? 'text-royal-600' : 'text-royal-300'}`}>
            {quote.formattedRange}
          </p>
          <p className={`mt-1 text-[0.8125rem] ${compact ? 'text-gray-500' : 'text-white/50'}`}>
            Estimated price range · final quote confirmed on-site
          </p>

          <ul className={`mt-5 space-y-3 border-t pt-5 ${compact ? 'border-gray-100' : 'border-white/10'}`}>
            {quote.lineItems.map((item) => (
              <li key={item.serviceId} className="flex items-start justify-between gap-3 text-[0.8125rem]">
                <div className="min-w-0">
                  <p className={`font-medium ${compact ? 'text-navy-900' : 'text-white/90'}`}>{item.serviceName}</p>
                  <p className={`mt-0.5 truncate ${compact ? 'text-gray-500' : 'text-white/45'}`}>{item.summary}</p>
                </div>
                <p className={`shrink-0 font-medium tabular-nums ${compact ? 'text-gray-600' : 'text-white/70'}`}>
                  {formatCurrency(item.low)}–{formatCurrency(item.high)}
                </p>
              </li>
            ))}
          </ul>

          {selectedServices.length > quote.lineItems.length && (
            <p className={`mt-4 text-[0.75rem] ${compact ? 'text-gray-400' : 'text-white/40'}`}>
              Complete all service details to see your full estimate.
            </p>
          )}
        </>
      ) : (
        <div className={`mt-5 rounded-xl p-4 text-center ${compact ? 'bg-gray-50' : 'bg-white/[0.04]'}`}>
          <p className={`text-[0.875rem] ${compact ? 'text-gray-500' : 'text-white/55'}`}>
            {selectedServices.length
              ? 'Answer the questions to see your instant estimate.'
              : 'Select services to get started.'}
          </p>
        </div>
      )}

      <p className={`mt-5 text-[0.75rem] leading-relaxed ${compact ? 'text-gray-400' : 'text-white/35'}`}>
        Estimates are based on typical Central Valley properties. Final pricing confirmed after a free on-site walkthrough.
      </p>
    </div>
  )
}
