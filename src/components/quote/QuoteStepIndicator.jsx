const STEPS = [
  { id: 'services', label: 'Services' },
  { id: 'details', label: 'Details' },
  { id: 'contact', label: 'Contact' },
  { id: 'confirm', label: 'Done' },
]

export default function QuoteStepIndicator({ currentStep }) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep)

  return (
    <nav aria-label="Quote progress" className="mb-8">
      <ol className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((step, index) => {
          const isComplete = index < currentIndex
          const isCurrent = step.id === currentStep
          const isUpcoming = index > currentIndex

          return (
            <li key={step.id} className="flex flex-1 items-center">
              <div className="flex w-full flex-col items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[0.8125rem] font-semibold transition-all duration-500 sm:h-9 sm:w-9 ${
                    isComplete
                      ? 'bg-royal-600 text-white shadow-[0_2px_8px_rgba(29,78,216,0.35)]'
                      : isCurrent
                        ? 'bg-navy-900 text-white ring-4 ring-royal-100'
                        : 'border border-gray-200 bg-white text-gray-400'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`hidden text-[0.6875rem] font-medium tracking-wide uppercase sm:block ${
                    isCurrent ? 'text-navy-900' : isUpcoming ? 'text-gray-400' : 'text-royal-600'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-1 h-px flex-1 transition-colors duration-500 sm:mx-2 ${
                    index < currentIndex ? 'bg-royal-400' : 'bg-gray-200'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
