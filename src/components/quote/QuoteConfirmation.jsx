import { useNavigate } from 'react-router-dom'
import { BUSINESS } from '../../config/business'
import { buildQuoteSummaryText } from '../../utils/quotePricing'
import { buildBookingPrefill, saveBookingPrefill } from '../../utils/bookingPrefill'
import { CallButton } from '../ui/Button'
import QuoteSummary from './QuoteSummary'

export default function QuoteConfirmation({ quote, contact, selectedServices, answers }) {
  const navigate = useNavigate()

  const serviceNames = selectedServices
    .map((id) => quote.lineItems.find((l) => l.serviceId === id)?.serviceName)
    .filter(Boolean)

  const handleSchedule = () => {
    const prefill = buildBookingPrefill({
      name: contact?.name ?? '',
      phone: contact?.phone ?? '',
      email: contact?.email ?? '',
      address: contact?.address ?? '',
      services: serviceNames,
      estimateRange: quote?.formattedRange ?? '',
      quoteDetails: buildQuoteSummaryText(selectedServices, answers, quote),
    })
    saveBookingPrefill(prefill)
    navigate('/book-online', { state: prefill })
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-royal-100 text-royal-600">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </div>

      <h2 className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
        Your quote is on the way{contact?.name ? `, ${contact.name.split(' ')[0]}` : ''}!
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-gray-500">
        We received your instant quote request. Ready to pick a date? Schedule your appointment below — Mike will confirm availability before it&apos;s official.
      </p>

      <div className="mx-auto mt-8 max-w-sm text-left">
        <QuoteSummary quote={quote} selectedServices={selectedServices} compact />
      </div>

      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-royal-100 bg-royal-50/50 px-5 py-4">
        <p className="text-[0.8125rem] font-medium text-royal-800">Next step — request your appointment</p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-gray-500">
          Choose a preferred date and time window. Your estimate and contact details will be included automatically.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={handleSchedule}
          className="btn-royal btn-md w-full !rounded-xl sm:w-auto"
        >
          Schedule Appointment
        </button>
        <CallButton variant="secondary" className="w-full sm:w-auto" />
      </div>

      <p className="mt-6 text-[0.8125rem] text-gray-400">
        Need immediate help? Call{' '}
        <a href={BUSINESS.phoneHref} className="font-medium text-royal-600 hover:text-royal-700">
          {BUSINESS.phone}
        </a>
      </p>
    </div>
  )
}
