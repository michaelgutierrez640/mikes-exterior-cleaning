import { useRef, useState } from 'react'
import { BUSINESS } from '../../config/business'
import { submitLead } from '../../services/submitLead'
import { buildQuoteSummaryText } from '../../utils/quotePricing'
import { trackQuoteSubmitted } from '../../utils/analytics'

function validateContact({ name, phone, email, address }) {
  const errors = {}
  if (!name.trim()) errors.name = 'Name is required'
  if (!phone.trim()) errors.phone = 'Phone is required'
  else if (!/^[\d\s().+-]{10,}$/.test(phone.trim())) errors.phone = 'Enter a valid phone number'
  if (!email.trim()) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email'
  if (!address.trim()) errors.address = 'Address is required'
  return errors
}

export default function QuoteContactForm({
  selectedServices,
  answers,
  quote,
  onSuccess,
}) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', companyWebsite: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [submitError, setSubmitError] = useState('')
  const submitLock = useRef(false)

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitLock.current || status === 'sending') return

    const validationErrors = validateContact(form)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }

    submitLock.current = true
    setStatus('sending')
    setSubmitError('')

    const serviceNames = selectedServices
      .map((id) => quote.lineItems.find((l) => l.serviceId === id)?.serviceName)
      .filter(Boolean)
      .join(', ')

    const summaryText = buildQuoteSummaryText(selectedServices, answers, quote)

    try {
      // Exactly one CRM lead + one FormSubmit email (via submitLead)
      await submitLead({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        service: serviceNames || 'Instant Quote',
        message: summaryText,
        subject: `Instant Quote Request (${quote.formattedRange}) — ${BUSINESS.name}`,
        source: 'instant_quote',
        companyWebsite: form.companyWebsite || '',
      })

      // Exactly one instant_quote_completed first-party event
      trackQuoteSubmitted({
        totalLow: quote.totalLow,
        totalHigh: quote.totalHigh,
        services: selectedServices,
      })

      onSuccess(form)
    } catch {
      submitLock.current = false
      setStatus('error')
      setSubmitError('Something went wrong. Please call us directly or try again.')
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-navy-900 sm:text-2xl">Almost done — where should we send your quote?</h2>
      <p className="mt-2 text-[0.9375rem] text-gray-500">
        We&apos;ll confirm your estimate and schedule a free on-site walkthrough.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate aria-label="Instant quote contact form">
        <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor="quote-company-website">Company website</label>
          <input
            id="quote-company-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.companyWebsite}
            onChange={(e) => updateField('companyWebsite', e.target.value)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="quote-name" className="mb-2 block text-[0.8125rem] font-medium text-gray-600">
              Name <span className="text-amber-500">*</span>
            </label>
            <input
              id="quote-name"
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              autoComplete="name"
              placeholder="Your full name"
              className={`input-light ${errors.name ? 'border-red-300 focus:border-red-400' : ''}`}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'quote-name-error' : undefined}
            />
            {errors.name && (
              <p id="quote-name-error" className="mt-1.5 text-[0.75rem] text-red-600" role="alert">{errors.name}</p>
            )}
          </div>
          <div>
            <label htmlFor="quote-phone" className="mb-2 block text-[0.8125rem] font-medium text-gray-600">
              Phone <span className="text-amber-500">*</span>
            </label>
            <input
              id="quote-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              autoComplete="tel"
              placeholder="(209) 496-5519"
              className={`input-light ${errors.phone ? 'border-red-300 focus:border-red-400' : ''}`}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'quote-phone-error' : undefined}
            />
            {errors.phone && (
              <p id="quote-phone-error" className="mt-1.5 text-[0.75rem] text-red-600" role="alert">{errors.phone}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="quote-email" className="mb-2 block text-[0.8125rem] font-medium text-gray-600">
            Email <span className="text-amber-500">*</span>
          </label>
          <input
            id="quote-email"
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className={`input-light ${errors.email ? 'border-red-300 focus:border-red-400' : ''}`}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'quote-email-error' : undefined}
          />
          {errors.email && (
            <p id="quote-email-error" className="mt-1.5 text-[0.75rem] text-red-600" role="alert">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="quote-address" className="mb-2 block text-[0.8125rem] font-medium text-gray-600">
            Property address <span className="text-amber-500">*</span>
          </label>
          <input
            id="quote-address"
            type="text"
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            autoComplete="street-address"
            placeholder="Street address, city"
            className={`input-light ${errors.address ? 'border-red-300 focus:border-red-400' : ''}`}
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? 'quote-address-error' : undefined}
          />
          {errors.address && (
            <p id="quote-address-error" className="mt-1.5 text-[0.75rem] text-red-600" role="alert">{errors.address}</p>
          )}
        </div>

        {submitError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] text-red-600" role="alert">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn-royal btn-md w-full !rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'sending' ? 'Submitting...' : 'Get My Instant Quote'}
        </button>

        <p className="text-center text-[0.75rem] text-gray-400">
          No obligation. We respond within 24 hours — usually same day.
        </p>
      </form>
    </div>
  )
}
