import { useState } from 'react'
import { BUSINESS } from '../config/business'

const FORM_ENDPOINT = `https://formsubmit.co/ajax/${BUSINESS.email}`

const SERVICE_OPTIONS = [
  'Window Cleaning',
  'Solar Panel Cleaning',
  'Gutter Cleaning',
  'Pressure Washing',
  'Other',
]

export default function ContactForm() {
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const form = e.target
    const data = {
      name: form.name.value,
      phone: form.phone.value,
      email: form.email.value,
      address: form.address.value,
      service: form.service.value,
      message: form.message.value,
      _subject: `Free Quote Request — ${BUSINESS.name}`,
      _template: 'table',
      _captcha: 'false',
    }

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Submission failed')

      setStatus('success')
      form.reset()
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong. Please call us directly or try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className="glass-form p-8 text-center sm:p-10" role="status">
        <div className="icon-wrap-lg mx-auto mb-5 bg-royal-600/15 text-royal-300">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h3 className="font-display text-xl font-semibold text-white">Thank You</h3>
        <p className="mt-2 text-[0.9375rem] text-white/55">We received your request and will respond within 24 hours.</p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 text-[0.8125rem] font-semibold text-royal-300 transition-colors hover:text-royal-200"
        >
          Submit another request
        </button>
      </div>
    )
  }

  return (
    <form
      className="glass-form p-7 sm:p-9"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Request a free quote"
    >
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-2 block text-[0.8125rem] font-medium text-white/60">
              Name <span className="text-amber-400">*</span>
            </label>
            <input id="name" name="name" type="text" required autoComplete="name" placeholder="Your full name" className="input-dark" />
          </div>
          <div>
            <label htmlFor="phone" className="mb-2 block text-[0.8125rem] font-medium text-white/60">
              Phone <span className="text-amber-400">*</span>
            </label>
            <input id="phone" name="phone" type="tel" required autoComplete="tel" placeholder="(209) 496-5519" className="input-dark" />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-[0.8125rem] font-medium text-white/60">
            Email <span className="text-amber-400">*</span>
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="input-dark" />
        </div>

        <div>
          <label htmlFor="address" className="mb-2 block text-[0.8125rem] font-medium text-white/60">
            Address <span className="text-amber-400">*</span>
          </label>
          <input id="address" name="address" type="text" required autoComplete="street-address" placeholder="Street address, city" className="input-dark" />
        </div>

        <div>
          <label htmlFor="service" className="mb-2 block text-[0.8125rem] font-medium text-white/60">
            Service <span className="text-amber-400">*</span>
          </label>
          <select id="service" name="service" required className="input-dark" defaultValue="">
            <option value="" disabled className="bg-navy-900">Select a service...</option>
            {SERVICE_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-navy-900">{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="message" className="mb-2 block text-[0.8125rem] font-medium text-white/60">Message</label>
          <textarea
            id="message"
            name="message"
            rows={4}
            placeholder="Tell us about your property..."
            className="input-dark resize-none"
          />
        </div>

        {status === 'error' && (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-[0.8125rem] text-red-300" role="alert">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn-royal btn-md w-full rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending...' : 'Get Free Quote'}
        </button>

        <p className="text-center text-[0.75rem] text-white/30">
          No obligation. We respond within 24 hours.
        </p>
      </div>
    </form>
  )
}
