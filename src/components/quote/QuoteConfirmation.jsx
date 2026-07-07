import { Link } from 'react-router-dom'
import { BUSINESS } from '../../config/business'
import { CallButton } from '../ui/Button'
import QuoteSummary from './QuoteSummary'

export default function QuoteConfirmation({ quote, contact, selectedServices }) {
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
        We received your instant quote request and will reach out shortly to confirm your estimate and schedule a free on-site walkthrough.
      </p>

      <div className="mx-auto mt-8 max-w-sm text-left">
        <QuoteSummary quote={quote} selectedServices={selectedServices} compact />
      </div>

      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-royal-100 bg-royal-50/50 px-5 py-4">
        <p className="text-[0.8125rem] font-medium text-royal-800">Expected response time</p>
        <p className="mt-1 font-display text-xl font-semibold text-navy-900">Within 24 hours</p>
        <p className="mt-1 text-[0.8125rem] text-gray-500">Most requests answered same business day</p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <CallButton className="w-full sm:w-auto" />
        <Link to="/#contact" className="btn-royal btn-md w-full !rounded-xl sm:w-auto">
          Book Free Estimate
        </Link>
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
