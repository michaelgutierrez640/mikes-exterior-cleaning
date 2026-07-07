import { useEffect, useMemo, useState } from 'react'
import {
  BOOKABLE_SERVICES,
  BOOKING_MODE,
  getMaxBookingDate,
  getMinBookingDate,
} from '../../config/booking'
import { submitBookingRequest } from '../../services/submitBooking'
import { getAvailableTimeWindows } from '../../services/calendarService'
import TimeWindowPicker from './TimeWindowPicker'
import BookingConfirmation from './BookingConfirmation'

function validateBooking(form, selectedServiceIds, timeWindow, customTime) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Name is required'
  if (!form.phone.trim()) errors.phone = 'Phone is required'
  else if (!/^[\d\s().+-]{10,}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number'
  if (!form.email.trim()) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email'
  if (!form.address.trim()) errors.address = 'Service address is required'
  if (!selectedServiceIds.length) errors.services = 'Select at least one service'
  if (!form.preferredDate) errors.preferredDate = 'Preferred date is required'
  if (!timeWindow) errors.timeWindow = 'Please select a time window'
  if (timeWindow === 'custom' && !customTime.trim()) errors.customTime = 'Please describe your preferred time'
  return errors
}

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  preferredDate: '',
  notes: '',
}

export default function BookingForm({ prefill = null, compact = false }) {
  const initialServices = useMemo(() => {
    if (!prefill?.services?.length) {
      if (prefill?.serviceSlug) {
        const match = BOOKABLE_SERVICES.find((s) => s.id === prefill.serviceSlug)
        return match ? [match.id] : []
      }
      return []
    }
    return BOOKABLE_SERVICES.filter((s) =>
      prefill.services.some(
        (name) => name === s.name || name === s.id || name.toLowerCase() === s.name.toLowerCase(),
      ),
    ).map((s) => s.id)
  }, [prefill])

  const [form, setForm] = useState({
    ...emptyForm,
    name: prefill?.name ?? '',
    phone: prefill?.phone ?? '',
    email: prefill?.email ?? '',
    address: prefill?.address ?? '',
  })
  const [selectedServices, setSelectedServices] = useState(initialServices)
  const [timeWindow, setTimeWindow] = useState('')
  const [customTime, setCustomTime] = useState('')
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [calendarNote, setCalendarNote] = useState('')

  const estimateRange = prefill?.estimateRange ?? ''
  const quoteDetails = prefill?.quoteDetails ?? ''

  useEffect(() => {
    if (!form.preferredDate) return
    let cancelled = false
    getAvailableTimeWindows(form.preferredDate).then(() => {
      if (!cancelled) setCalendarNote('')
    })
    return () => { cancelled = true }
  }, [form.preferredDate])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const toggleService = (serviceId) => {
    setSelectedServices((prev) => {
      const next = prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
      return next
    })
    if (errors.services) setErrors((prev) => ({ ...prev, services: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validateBooking(form, selectedServices, timeWindow, customTime)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }

    setStatus('sending')
    setSubmitError('')

    const serviceNames = selectedServices
      .map((id) => BOOKABLE_SERVICES.find((s) => s.id === id)?.name)
      .filter(Boolean)

    try {
      await submitBookingRequest({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        preferredDate: form.preferredDate,
        timeWindow,
        customTime: customTime.trim(),
        services: serviceNames,
        estimateRange,
        notes: form.notes.trim(),
        quoteDetails,
      })
      setSubmitted(true)
    } catch {
      setStatus('error')
      setSubmitError('Something went wrong. Please call us directly or try again.')
    }
  }

  if (submitted) {
    return <BookingConfirmation />
  }

  return (
    <div className={compact ? '' : ''}>
      {!compact && (
        <>
          <h2 className="font-display text-xl font-semibold text-navy-900 sm:text-2xl">
            Request an appointment
          </h2>
          <p className="mt-2 text-[0.9375rem] text-gray-500">
            Choose your preferred date and time. Mike will confirm availability before your appointment is official.
            {BOOKING_MODE === 'request' && (
              <span className="mt-1 block text-[0.8125rem] text-royal-700/80">
                Request-only mode — no automatic calendar booking yet.
              </span>
            )}
          </p>
        </>
      )}

      {estimateRange && (
        <div className="mt-6 rounded-xl border border-royal-100 bg-royal-50/40 px-4 py-3">
          <p className="text-[0.75rem] font-medium tracking-wide text-royal-800 uppercase">Your instant quote</p>
          <p className="mt-1 font-display text-xl font-semibold text-royal-700">{estimateRange}</p>
        </div>
      )}

      <form className="mt-6 space-y-6" onSubmit={handleSubmit} noValidate aria-label="Book appointment form">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="booking-name" className="mb-2 block text-[0.8125rem] font-medium text-gray-600">
              Name <span className="text-amber-500">*</span>
            </label>
            <input
              id="booking-name"
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              autoComplete="name"
              placeholder="Your full name"
              className={`input-light ${errors.name ? 'border-red-300 focus:border-red-400' : ''}`}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <p className="mt-1.5 text-[0.75rem] text-red-600" role="alert">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="booking-phone" className="mb-2 block text-[0.8125rem] font-medium text-gray-600">
              Phone <span className="text-amber-500">*</span>
            </label>
            <input
              id="booking-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              autoComplete="tel"
              placeholder="(209) 496-5519"
              className={`input-light ${errors.phone ? 'border-red-300 focus:border-red-400' : ''}`}
              aria-invalid={Boolean(errors.phone)}
            />
            {errors.phone && <p className="mt-1.5 text-[0.75rem] text-red-600" role="alert">{errors.phone}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="booking-email" className="mb-2 block text-[0.8125rem] font-medium text-gray-600">
            Email <span className="text-amber-500">*</span>
          </label>
          <input
            id="booking-email"
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className={`input-light ${errors.email ? 'border-red-300 focus:border-red-400' : ''}`}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="mt-1.5 text-[0.75rem] text-red-600" role="alert">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="booking-address" className="mb-2 block text-[0.8125rem] font-medium text-gray-600">
            Service address <span className="text-amber-500">*</span>
          </label>
          <input
            id="booking-address"
            type="text"
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            autoComplete="street-address"
            placeholder="Street address, city"
            className={`input-light ${errors.address ? 'border-red-300 focus:border-red-400' : ''}`}
            aria-invalid={Boolean(errors.address)}
          />
          {errors.address && <p className="mt-1.5 text-[0.75rem] text-red-600" role="alert">{errors.address}</p>}
        </div>

        <fieldset>
          <legend className="mb-3 block text-[0.8125rem] font-medium text-gray-600">
            Services needed <span className="text-amber-500">*</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {BOOKABLE_SERVICES.map((service) => {
              const checked = selectedServices.includes(service.id)
              return (
                <label
                  key={service.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-all duration-200 ${
                    checked
                      ? 'border-royal-400 bg-royal-50/60 ring-1 ring-royal-200'
                      : 'border-gray-200 hover:border-royal-200 hover:bg-royal-50/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleService(service.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-royal-600 focus:ring-royal-500"
                  />
                  <span>
                    <span className="block text-[0.9375rem] font-medium text-navy-900">{service.name}</span>
                    <span className="mt-0.5 block text-[0.75rem] text-gray-500">{service.shortDescription}</span>
                  </span>
                </label>
              )
            })}
          </div>
          {errors.services && <p className="mt-2 text-[0.75rem] text-red-600" role="alert">{errors.services}</p>}
        </fieldset>

        <div>
          <label htmlFor="booking-date" className="mb-2 block text-[0.8125rem] font-medium text-gray-600">
            Preferred date <span className="text-amber-500">*</span>
          </label>
          <input
            id="booking-date"
            type="date"
            value={form.preferredDate}
            min={getMinBookingDate()}
            max={getMaxBookingDate()}
            onChange={(e) => updateField('preferredDate', e.target.value)}
            className={`input-light ${errors.preferredDate ? 'border-red-300 focus:border-red-400' : ''}`}
            aria-invalid={Boolean(errors.preferredDate)}
          />
          {errors.preferredDate && (
            <p className="mt-1.5 text-[0.75rem] text-red-600" role="alert">{errors.preferredDate}</p>
          )}
          {calendarNote && (
            <p className="mt-1.5 text-[0.75rem] text-gray-500">{calendarNote}</p>
          )}
        </div>

        <TimeWindowPicker
          value={timeWindow}
          customTime={customTime}
          onChange={(id) => {
            setTimeWindow(id)
            if (errors.timeWindow) setErrors((prev) => ({ ...prev, timeWindow: undefined }))
          }}
          onCustomTimeChange={(v) => {
            setCustomTime(v)
            if (errors.customTime) setErrors((prev) => ({ ...prev, customTime: undefined }))
          }}
          error={errors.timeWindow}
          customError={errors.customTime}
        />

        <div>
          <label htmlFor="booking-notes" className="mb-2 block text-[0.8125rem] font-medium text-gray-600">
            Notes / special instructions
          </label>
          <textarea
            id="booking-notes"
            rows={4}
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Gate code, pets, parking, access details, etc."
            className="input-light min-h-[100px] resize-y"
          />
        </div>

        {submitError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] text-red-600" role="alert">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn-royal btn-md w-full !rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'sending' ? 'Submitting request...' : 'Request Appointment'}
        </button>

        <p className="text-center text-[0.75rem] text-gray-400">
          This submits a request — Mike will confirm your appointment before it is scheduled.
        </p>
      </form>
    </div>
  )
}
