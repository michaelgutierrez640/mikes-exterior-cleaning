import { QUOTE_SERVICES } from '../../config/quoteServices'

const ICONS = {
  windows: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
  ),
  pressure: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
  ),
  gutters: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
  ),
  solar: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
  ),
}

export default function QuoteServiceSelector({ selected, onToggle, error }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-navy-900 sm:text-2xl">What services do you need?</h2>
      <p className="mt-2 text-[0.9375rem] text-gray-500">Select one or more — bundle multiple services and save 10%.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2" role="group" aria-label="Select services">
        {QUOTE_SERVICES.map((service) => {
          const isSelected = selected.includes(service.id)
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onToggle(service.id)}
              aria-pressed={isSelected}
              className={`group relative flex items-start gap-4 rounded-2xl border p-5 text-left transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-400 ${
                isSelected
                  ? 'border-royal-300 bg-royal-50/60 shadow-[0_4px_20px_rgba(37,99,235,0.1)]'
                  : 'border-gray-200/80 bg-white hover:border-royal-200 hover:shadow-md'
              }`}
            >
              <div
                className={`icon-wrap shrink-0 transition-colors duration-300 ${
                  isSelected ? 'bg-royal-600 text-white' : 'bg-gray-100 text-navy-900 group-hover:bg-royal-100 group-hover:text-royal-700'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                  {ICONS[service.icon]}
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-navy-900">{service.name}</p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-gray-500">{service.shortDescription}</p>
              </div>
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isSelected ? 'border-royal-600 bg-royal-600' : 'border-gray-300 bg-white'
                }`}
                aria-hidden="true"
              >
                {isSelected && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
