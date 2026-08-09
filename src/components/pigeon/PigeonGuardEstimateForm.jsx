import { useRef, useState } from 'react'
import { BUSINESS } from '../../config/business'
import SmsConsentCheckbox from '../forms/SmsConsentCheckbox'
import { submitLead } from '../../services/submitLead'
import {
  trackPigeonGuardFormStarted,
  trackPigeonGuardLeadSubmitted,
  trackPigeonGuardPhotoAdded,
} from '../../utils/analytics'
import {
  LEAD_PHOTO_ACCEPT,
  MAX_LEAD_PHOTOS,
  prepareImageForUpload,
  uploadLeadPhoto,
} from '../../utils/leadPhotos'

const PROBLEM_OPTIONS = [
  { value: 'Pigeons currently nesting', label: 'Pigeons currently nesting' },
  { value: 'Droppings/debris', label: 'Droppings/debris' },
  { value: 'Noise under panels', label: 'Noise under panels' },
  { value: 'Preventative installation', label: 'Preventative installation' },
  { value: 'Not sure', label: 'Not sure' },
]

const SUCCESS_MESSAGE =
  'Thanks — Mike will review your information and contact you about your free pigeon guard estimate.'

function validateForm(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Full name is required'
  if (!form.phone.trim()) errors.phone = 'Phone is required'
  else if (!/^[\d\s().+-]{10,}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email or leave it blank'
  }
  if (!form.address.trim()) errors.address = 'Property address is required'
  if (!form.city.trim()) errors.city = 'City is required'
  if (!form.problem) errors.problem = 'Select what best describes the problem'
  return errors
}

function buildMessage(form) {
  const lines = [
    'Pigeon Guard estimate request',
    `Problem: ${form.problem}`,
  ]
  if (form.panelCount.trim()) {
    lines.push(`Approximate solar panels: ${form.panelCount.trim()}`)
  }
  if (form.notes.trim()) {
    lines.push(`Notes: ${form.notes.trim()}`)
  }
  return lines.join('\n')
}

export default function PigeonGuardEstimateForm() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    panelCount: '',
    problem: '',
    notes: '',
    companyWebsite: '',
  })
  const [smsConsent, setSmsConsent] = useState(false)
  const [photos, setPhotos] = useState([])
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [submitError, setSubmitError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const submitLock = useRef(false)
  const formStarted = useRef(false)

  const markStarted = () => {
    if (formStarted.current) return
    formStarted.current = true
    trackPigeonGuardFormStarted()
  }

  const updateField = (field, value) => {
    markStarted()
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handlePhotosSelected = async (e) => {
    markStarted()
    setPhotoError('')
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return

    const remaining = MAX_LEAD_PHOTOS - photos.length
    if (remaining <= 0) {
      setPhotoError(`You can upload up to ${MAX_LEAD_PHOTOS} photos.`)
      return
    }

    const selected = files.slice(0, remaining)
    const next = [...photos]
    for (const file of selected) {
      try {
        const prepared = await prepareImageForUpload(file)
        next.push(prepared)
        trackPigeonGuardPhotoAdded(next.length)
      } catch (err) {
        setPhotoError(err?.message || 'Could not add that photo.')
      }
    }
    setPhotos(next)
    if (files.length > remaining) {
      setPhotoError(`Only ${MAX_LEAD_PHOTOS} photos are allowed. Extra files were skipped.`)
    }
  }

  const removePhoto = (index) => {
    setPhotos((prev) => {
      const copy = [...prev]
      const [removed] = copy.splice(index, 1)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return copy
    })
    setPhotoError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitLock.current || status === 'sending' || status === 'success') return

    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }

    submitLock.current = true
    setStatus('sending')
    setSubmitError('')
    setPhotoError('')

    try {
      const uploaded = []
      for (const prepared of photos) {
        const meta = await uploadLeadPhoto(prepared)
        uploaded.push(meta)
      }

      await submitLead({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        address: form.address.trim(),
        city: form.city.trim(),
        service: 'Pigeon Guard',
        message: buildMessage(form),
        subject: `Pigeon Guard Estimate Request — ${BUSINESS.name}`,
        source: 'pigeon_guard_landing',
        companyWebsite: form.companyWebsite || '',
        smsConsent: smsConsent === true,
        photos: uploaded,
      })

      trackPigeonGuardLeadSubmitted()
      setStatus('success')
    } catch (err) {
      submitLock.current = false
      setStatus('error')
      setSubmitError(err?.message || 'Something went wrong. Please call us directly or try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        className="rounded-[1.25rem] border border-emerald-200/80 bg-emerald-50/80 px-6 py-8 sm:px-8"
        role="status"
        aria-live="polite"
      >
        <h3 className="font-display text-xl font-semibold text-navy-900 sm:text-2xl">Request received</h3>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-gray-700 sm:text-base">{SUCCESS_MESSAGE}</p>
        <p className="mt-4 text-[0.875rem] text-gray-500">
          Prefer to talk now? Call Mike at{' '}
          <a href={BUSINESS.phoneHref} className="font-semibold text-royal-700 underline underline-offset-2">
            {BUSINESS.phone}
          </a>
          .
        </p>
      </div>
    )
  }

  const fieldClass = (hasError) =>
    `input-light-compact ${hasError ? 'border-red-300 focus:border-red-400' : ''}`

  return (
    <form
      className="form-control-surface space-y-3.5 sm:space-y-5"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Pigeon guard estimate form"
    >
      <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="pg-company-website">Company website</label>
        <input
          id="pg-company-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.companyWebsite}
          onChange={(e) => updateField('companyWebsite', e.target.value)}
        />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-5">
        <div>
          <label htmlFor="pg-name" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-700 sm:mb-2">
            Full name <span className="text-amber-500">*</span>
          </label>
          <input
            id="pg-name"
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            onFocus={markStarted}
            autoComplete="name"
            className={fieldClass(errors.name)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'pg-name-error' : undefined}
          />
          {errors.name && (
            <p id="pg-name-error" className="mt-1.5 text-[0.75rem] text-red-600" role="alert">
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="pg-phone" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-700 sm:mb-2">
            Phone <span className="text-amber-500">*</span>
          </label>
          <input
            id="pg-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            onFocus={markStarted}
            autoComplete="tel"
            placeholder="(209) 496-5519"
            className={fieldClass(errors.phone)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'pg-phone-error' : undefined}
          />
          {errors.phone && (
            <p id="pg-phone-error" className="mt-1.5 text-[0.75rem] text-red-600" role="alert">
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="pg-email" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-700 sm:mb-2">
          Email <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          id="pg-email"
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          onFocus={markStarted}
          autoComplete="email"
          className={fieldClass(errors.email)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'pg-email-error' : undefined}
        />
        {errors.email && (
          <p id="pg-email-error" className="mt-1.5 text-[0.75rem] text-red-600" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-5">
        <div>
          <label htmlFor="pg-address" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-700 sm:mb-2">
            Property address <span className="text-amber-500">*</span>
          </label>
          <input
            id="pg-address"
            type="text"
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            onFocus={markStarted}
            autoComplete="street-address"
            className={fieldClass(errors.address)}
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? 'pg-address-error' : undefined}
          />
          {errors.address && (
            <p id="pg-address-error" className="mt-1.5 text-[0.75rem] text-red-600" role="alert">
              {errors.address}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="pg-city" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-700 sm:mb-2">
            City <span className="text-amber-500">*</span>
          </label>
          <input
            id="pg-city"
            type="text"
            value={form.city}
            onChange={(e) => updateField('city', e.target.value)}
            onFocus={markStarted}
            autoComplete="address-level2"
            className={fieldClass(errors.city)}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? 'pg-city-error' : undefined}
          />
          {errors.city && (
            <p id="pg-city-error" className="mt-1.5 text-[0.75rem] text-red-600" role="alert">
              {errors.city}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="pg-panels" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-700 sm:mb-2">
          Approximate number of solar panels <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          id="pg-panels"
          type="text"
          inputMode="numeric"
          value={form.panelCount}
          onChange={(e) => updateField('panelCount', e.target.value)}
          onFocus={markStarted}
          placeholder="e.g. 24"
          className="input-light-compact"
        />
      </div>

      <fieldset className="form-control-surface">
        <legend className="mb-1.5 block text-[0.8125rem] font-medium text-gray-700 sm:mb-2">
          What best describes the problem? <span className="text-amber-500">*</span>
        </legend>
        <div
          className="space-y-2"
          role="radiogroup"
          aria-required="true"
          aria-describedby={errors.problem ? 'pg-problem-error' : undefined}
        >
          {PROBLEM_OPTIONS.map((opt) => {
            const selected = form.problem === opt.value
            const radioId = `pg-problem-${opt.value.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
            return (
              <label
                key={opt.value}
                htmlFor={radioId}
                className={[
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-[0.875rem] text-navy-900 transition sm:px-4 sm:py-3',
                  selected ? 'border-royal-300 ring-1 ring-royal-200' : 'border-black/[0.08] hover:border-royal-200',
                ].join(' ')}
              >
                <input
                  id={radioId}
                  type="radio"
                  name="pg-problem"
                  value={opt.value}
                  checked={selected}
                  onChange={() => updateField('problem', opt.value)}
                  onFocus={markStarted}
                  className="form-radio"
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
        {errors.problem && (
          <p id="pg-problem-error" className="mt-1.5 text-[0.75rem] text-red-600" role="alert">
            {errors.problem}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="pg-notes" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-700 sm:mb-2">
          Notes <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="pg-notes"
          rows={3}
          value={form.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          onFocus={markStarted}
          placeholder="Anything else about access, timing, or what you’re seeing under the panels"
          className="input-light-compact min-h-[5rem] resize-y sm:min-h-[6rem]"
        />
      </div>

      <div>
        <label htmlFor="pg-photos" className="mb-1.5 block text-[0.8125rem] font-medium text-gray-700 sm:mb-2">
          Photos of roof, panels, nesting, or damage{' '}
          <span className="font-normal text-gray-400">(optional, up to {MAX_LEAD_PHOTOS})</span>
        </label>
        <p className="mb-1.5 text-[0.75rem] leading-snug text-gray-600">
          JPG, PNG, HEIC, or WebP · 10 MB max per image. Photos stay private in your estimate request.
        </p>
        <input
          id="pg-photos"
          type="file"
          accept={LEAD_PHOTO_ACCEPT}
          multiple
          onChange={handlePhotosSelected}
          onFocus={markStarted}
          className="block w-full text-[0.8125rem] text-gray-600 file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-royal-50 file:px-3 file:py-2.5 file:text-[0.8125rem] file:font-semibold file:text-royal-800"
        />
        {photoError && (
          <p className="mt-1.5 text-[0.75rem] text-red-600" role="alert">
            {photoError}
          </p>
        )}
        {photos.length > 0 && (
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {photos.map((photo, index) => (
              <li key={`${photo.previewUrl}-${index}`} className="relative overflow-hidden rounded-lg bg-gray-100">
                {photo.heic ? (
                  <div className="flex aspect-square items-center justify-center p-2 text-center text-[0.65rem] text-gray-500">
                    HEIC ready
                  </div>
                ) : (
                  <img
                    src={photo.previewUrl}
                    alt=""
                    className="aspect-square h-full w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 rounded bg-navy-950/75 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white"
                  aria-label={`Remove photo ${index + 1}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SmsConsentCheckbox id="pg-sms-consent" checked={smsConsent} onChange={setSmsConsent} />

      {submitError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700" role="alert">
          {submitError}
        </p>
      )}

      <button
        id="pg-submit"
        type="submit"
        disabled={status === 'sending'}
        className="btn-royal btn-md w-full !min-h-11 !rounded-xl sm:w-auto"
      >
        {status === 'sending' ? 'Sending…' : 'Get My Free Pigeon Guard Estimate'}
      </button>
    </form>
  )
}
