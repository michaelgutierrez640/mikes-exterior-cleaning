import { useRef, useState } from 'react'
import { BUSINESS } from '../../config/business'
import SmsConsentCheckbox from '../forms/SmsConsentCheckbox'
import { attachLeadPhotos, createCrmLead, sendFormSubmitEmail } from '../../services/submitLead'
import {
  trackPigeonGuardFormStarted,
  trackPigeonGuardLeadSubmitted,
  trackPigeonGuardPhotoAdded,
} from '../../utils/analytics'
import {
  LEAD_PHOTO_ACCEPT,
  LEAD_PHOTO_UPLOADS_ENABLED,
  MAX_LEAD_PHOTOS,
  prepareImageForUpload,
  uploadLeadPhoto,
} from '../../utils/leadPhotos'
import {
  ALL_PROBLEM_OPTIONS,
  formatProblemsForMessage,
  toggleProblemSelection,
  validateProblemSelection,
} from '../../utils/pigeonProblems'
import {
  createIdempotencyKey,
  runPigeonGuardSubmission,
} from '../../utils/pigeonSubmit'

const SUCCESS_MESSAGE =
  'Thanks — Mike will review your information and contact you about your free pigeon guard estimate.'

function validateForm(form, problems) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Full name is required'
  if (!form.phone.trim()) errors.phone = 'Phone is required'
  else if (!/^[\d\s().+-]{10,}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email or leave it blank'
  }
  if (!form.address.trim()) errors.address = 'Property address is required'
  if (!form.city.trim()) errors.city = 'City is required'
  const problemCheck = validateProblemSelection(problems)
  if (!problemCheck.ok) errors.problems = problemCheck.error
  return errors
}

function buildMessage(form, problems) {
  const lines = [
    'Pigeon Guard estimate request',
    formatProblemsForMessage(problems),
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
    notes: '',
    companyWebsite: '',
  })
  const [problems, setProblems] = useState([])
  const [smsConsent, setSmsConsent] = useState(false)
  const [photos, setPhotos] = useState([])
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [submitError, setSubmitError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [photoWarning, setPhotoWarning] = useState('')
  const [sendingLabel, setSendingLabel] = useState('Sending…')
  const submitLock = useRef(false)
  const formStarted = useRef(false)
  const idempotencyKeyRef = useRef(createIdempotencyKey())

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

  const handleProblemToggle = (value, checked) => {
    markStarted()
    setProblems((prev) => toggleProblemSelection(prev, value, checked))
    if (errors.problems) setErrors((prev) => ({ ...prev, problems: undefined }))
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

    const validationErrors = validateForm(form, problems)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }

    submitLock.current = true
    setStatus('sending')
    setSendingLabel('Sending…')
    setSubmitError('')
    setPhotoError('')
    setPhotoWarning('')

    try {
      const message = buildMessage(form, problems)
      const result = await runPigeonGuardSubmission(
        {
          form,
          problems,
          photos,
          smsConsent,
          idempotencyKey: idempotencyKeyRef.current,
          companyWebsite: form.companyWebsite,
        },
        {
          createLead: async ({ form: f, problems: selected, smsConsent: consent, idempotencyKey }) =>
            createCrmLead({
              name: f.name.trim(),
              phone: f.phone.trim(),
              email: f.email.trim() || null,
              address: f.address.trim(),
              city: f.city.trim(),
              service: 'Pigeon Guard',
              message,
              subject: `Pigeon Guard Estimate Request — ${BUSINESS.name}`,
              source: 'pigeon_guard_landing',
              companyWebsite: f.companyWebsite || '',
              smsConsent: consent === true,
              problems: selected,
              idempotencyKey,
              photos: [],
            }),
          uploadPhoto: async (prepared, { abortSignal } = {}) => {
            setSendingLabel('Uploading photos…')
            return uploadLeadPhoto(prepared, { abortSignal })
          },
          deletePhotos: async (orphans) => {
            const { deleteLeadPhotos } = await import('../../utils/leadPhotos')
            await deleteLeadPhotos(orphans)
          },
          attachPhotos: async (payload) => {
            setSendingLabel('Finishing…')
            return attachLeadPhotos(payload)
          },
          notifyEmail: async ({ form: f, problems: selected }) =>
            sendFormSubmitEmail({
              name: f.name.trim(),
              phone: f.phone.trim(),
              email: f.email.trim() || null,
              address: f.address.trim(),
              service: 'Pigeon Guard',
              message: buildMessage(f, selected),
              subject: `Pigeon Guard Estimate Request — ${BUSINESS.name}`,
            }),
          onPhotoProgress: (index, total) => {
            setSendingLabel(`Uploading photo ${index} of ${total}…`)
          },
        },
      )

      trackPigeonGuardLeadSubmitted()
      setPhotoWarning(result.photoWarning || '')
      setStatus('success')
      // Fresh key only after success so retries stay idempotent.
      idempotencyKeyRef.current = createIdempotencyKey()
    } catch (err) {
      setStatus('error')
      setSubmitError(
        err?.code === 'TIMEOUT'
          ? err.message
          : err?.message || 'Something went wrong. Please call us directly or try again.',
      )
    } finally {
      // Always release the lock and never leave "Sending…" stuck.
      submitLock.current = false
      setStatus((prev) => (prev === 'sending' ? 'error' : prev))
      setSendingLabel('Sending…')
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
        {photoWarning && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-900" role="status">
            {photoWarning}
          </p>
        )}
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
        <p id="pg-problems-hint" className="mb-2 text-[0.75rem] leading-snug text-gray-600">
          Select all that apply. “Preventative” and “Not sure” clear the other options.
        </p>
        <div
          className="space-y-2"
          role="group"
          aria-required="true"
          aria-describedby={errors.problems ? 'pg-problems-error pg-problems-hint' : 'pg-problems-hint'}
        >
          {ALL_PROBLEM_OPTIONS.map((opt) => {
            const selected = problems.includes(opt.value)
            const checkboxId = `pg-problem-${opt.value.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
            return (
              <label
                key={opt.value}
                htmlFor={checkboxId}
                className={[
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-[0.875rem] text-navy-900 transition sm:px-4 sm:py-3',
                  selected ? 'border-royal-300 ring-1 ring-royal-200' : 'border-black/[0.08] hover:border-royal-200',
                ].join(' ')}
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  name="pg-problems"
                  value={opt.value}
                  checked={selected}
                  onChange={(e) => handleProblemToggle(opt.value, e.target.checked)}
                  onFocus={markStarted}
                  className="form-checkbox"
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
        {errors.problems && (
          <p id="pg-problems-error" className="mt-1.5 text-[0.75rem] text-red-600" role="alert">
            {errors.problems}
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
        {!LEAD_PHOTO_UPLOADS_ENABLED ? (
          <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-[0.8125rem] leading-snug text-amber-950">
            Photo upload is temporarily unavailable while private photo storage is being configured.
            You can still submit this form — Mike can request photos by text or email if needed.
          </p>
        ) : (
          <>
            <p className="mb-1.5 text-[0.75rem] leading-snug text-gray-600">
              JPG, PNG, HEIC, or WebP · 10 MB max per image. Photos are private to your estimate request
              and only viewable by Mike in Admin.
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
          </>
        )}
      </div>

      <SmsConsentCheckbox id="pg-sms-consent" checked={smsConsent} onChange={setSmsConsent} />

      {submitError && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700" role="alert">
          <p>{submitError}</p>
          <button
            type="button"
            className="mt-2 font-semibold text-red-800 underline underline-offset-2"
            onClick={() => {
              setSubmitError('')
              setStatus('idle')
            }}
          >
            Try Again
          </button>
        </div>
      )}

      <button
        id="pg-submit"
        type="submit"
        disabled={status === 'sending'}
        className="btn-royal btn-md w-full !min-h-11 !rounded-xl sm:w-auto"
      >
        {status === 'sending' ? sendingLabel : 'Get My Free Pigeon Guard Estimate'}
      </button>
    </form>
  )
}
