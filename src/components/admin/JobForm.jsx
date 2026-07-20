import { useState } from 'react'
import { SERVICES } from '../../config/content'
import { SERVICE_CITIES } from '../../config/serviceAreas'
import { MAX_PHOTOS, prepareImageForUpload, uploadPreparedFile } from '../../utils/projectPhotos'

const LABEL_OPTIONS = [
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'general', label: 'General' },
]

function emptyForm() {
  return {
    service: SERVICES[0]?.slug || 'window-cleaning',
    city: SERVICE_CITIES[0]?.slug || 'modesto',
    propertyType: 'residential',
    completedAt: new Date().toISOString().slice(0, 10),
    notes: '',
    photos: [],
  }
}

function formFromProject(project) {
  return {
    service: project.service,
    city: project.city,
    propertyType: project.propertyType,
    completedAt: project.completedAt,
    notes: project.notes || '',
    photos: (project.photos || []).map((p, i) => ({
      key: `existing-${i}-${p.url}`,
      url: p.url,
      pathname: p.pathname,
      label: p.label || 'general',
      alt: p.alt || '',
      contentType: p.contentType,
      size: p.size,
      width: p.width ?? null,
      height: p.height ?? null,
      blurDataUrl: p.blurDataUrl || null,
      variants: p.variants || null,
      previewUrl: p.variants?.card || p.variants?.thumb || p.url,
      uploaded: true,
      progress: 100,
    })),
  }
}

function serviceLabel(slug) {
  return SERVICES.find((s) => s.slug === slug)?.title || slug
}

function cityLabel(slug) {
  return SERVICE_CITIES.find((c) => c.slug === slug)?.name || slug
}

export default function JobForm({
  mode = 'create',
  initialProject = null,
  onCancel,
  onSaved,
  createProject,
  updateProject,
}) {
  const [form, setForm] = useState(() => (initialProject ? formFromProject(initialProject) : emptyForm()))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updatePhoto(key, patch) {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    }))
  }

  function removePhoto(key) {
    setForm((prev) => {
      const target = prev.photos.find((p) => p.key === key)
      if (target?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(target.previewUrl)
      return { ...prev, photos: prev.photos.filter((p) => p.key !== key) }
    })
  }

  async function onPickFiles(e) {
    setError('')
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return

    const remaining = MAX_PHOTOS - form.photos.length
    if (remaining <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos per job`)
      return
    }

    const selected = files.slice(0, remaining)
    const next = []
    for (const file of selected) {
      try {
        const prepared = await prepareImageForUpload(file)
        next.push({
          key: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: prepared.file,
          previewUrl: prepared.previewUrl,
          label: 'general',
          alt: '',
          contentType: prepared.contentType,
          stripped: prepared.stripped,
          heic: prepared.heic,
          width: prepared.width,
          height: prepared.height,
          blurDataUrl: prepared.blurDataUrl,
          variantFiles: prepared.variants,
          uploaded: false,
          progress: 0,
        })
      } catch (err) {
        setError(err.message || 'Could not prepare photo')
      }
    }
    if (next.length) setForm((prev) => ({ ...prev, photos: [...prev.photos, ...next] }))
  }

  async function ensureUploadedPhotos() {
    const uploaded = []
    const working = [...form.photos]

    for (let i = 0; i < working.length; i += 1) {
      const photo = working[i]
      if (photo.uploaded && photo.url) {
        uploaded.push({
          url: photo.url,
          pathname: photo.pathname || null,
          label: photo.label,
          alt: photo.alt,
          contentType: photo.contentType || null,
          size: photo.size ?? null,
          width: photo.width ?? null,
          height: photo.height ?? null,
          blurDataUrl: photo.blurDataUrl || null,
          variants: photo.variants || null,
        })
        continue
      }

      setBusyLabel(`Uploading ${i + 1} of ${working.length}…`)
      updatePhoto(photo.key, { progress: 1 })
      const blobMeta = await uploadPreparedFile(
        {
          file: photo.file,
          contentType: photo.contentType,
          width: photo.width,
          height: photo.height,
          blurDataUrl: photo.blurDataUrl,
          variants: photo.variantFiles || null,
        },
        {
          onProgress: (pct) => updatePhoto(photo.key, { progress: pct }),
        },
      )
      updatePhoto(photo.key, {
        uploaded: true,
        progress: 100,
        url: blobMeta.url,
        pathname: blobMeta.pathname,
        contentType: blobMeta.contentType,
        size: blobMeta.size,
        width: blobMeta.width,
        height: blobMeta.height,
        blurDataUrl: blobMeta.blurDataUrl,
        variants: blobMeta.variants,
      })
      working[i] = { ...photo, uploaded: true, url: blobMeta.url, pathname: blobMeta.pathname }
      uploaded.push({
        url: blobMeta.url,
        pathname: blobMeta.pathname,
        label: photo.label,
        alt: photo.alt,
        contentType: blobMeta.contentType,
        size: blobMeta.size,
        width: blobMeta.width,
        height: blobMeta.height,
        blurDataUrl: blobMeta.blurDataUrl,
        variants: blobMeta.variants,
      })
    }
    return uploaded
  }

  async function save(status) {
    setError('')
    setBusy(true)
    setBusyLabel(status === 'published' ? 'Publishing…' : 'Saving draft…')
    try {
      if (status === 'published' && form.photos.length === 0) {
        throw new Error('Add at least one photo before publishing')
      }
      const photos = await ensureUploadedPhotos()
      const payload = {
        service: form.service,
        city: form.city,
        propertyType: form.propertyType,
        completedAt: form.completedAt,
        notes: form.notes.trim(),
        photos,
        status,
      }

      let project
      if (mode === 'edit' && initialProject?.id) {
        project = await updateProject(initialProject.id, payload)
      } else {
        project = await createProject(payload)
      }
      onSaved?.(project)
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setBusy(false)
      setBusyLabel('')
    }
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_3px_rgba(10,22,40,0.06)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy-900">
            {mode === 'edit' ? 'Edit job' : 'Add new job'}
          </h2>
          <p className="mt-1 text-[0.875rem] text-gray-500">
            Photos upload to Vercel Blob. Job details save to Redis. Phase 1 is admin-only (not public yet).
          </p>
        </div>
        {onCancel && (
          <button type="button" className="btn-ghost btn-sm !rounded-xl" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[0.8125rem] font-medium text-gray-600">Service</span>
          <select className="input-light" value={form.service} onChange={(e) => setField('service', e.target.value)} disabled={busy}>
            {SERVICES.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-[0.8125rem] font-medium text-gray-600">City</span>
          <select className="input-light" value={form.city} onChange={(e) => setField('city', e.target.value)} disabled={busy}>
            {SERVICE_CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-[0.8125rem] font-medium text-gray-600">Property type</span>
          <select
            className="input-light"
            value={form.propertyType}
            onChange={(e) => setField('propertyType', e.target.value)}
            disabled={busy}
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-[0.8125rem] font-medium text-gray-600">Completion date</span>
          <input
            type="date"
            className="input-light"
            value={form.completedAt}
            onChange={(e) => setField('completedAt', e.target.value)}
            disabled={busy}
            required
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-[0.8125rem] font-medium text-gray-600">Short job notes</span>
        <textarea
          className="input-light min-h-[110px]"
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          maxLength={2000}
          placeholder="What was cleaned, neighborhood context, anything useful for later SEO copy…"
          disabled={busy}
        />
        <span className="mt-1 block text-[0.75rem] text-gray-400">{form.notes.length}/2000</span>
      </label>

      <div className="mt-6">
        <p className="text-[0.875rem] font-semibold text-navy-900">
          Photos ({form.photos.length}/{MAX_PHOTOS})
        </p>
        <p className="mt-1 text-[0.75rem] text-gray-500">
          JPEG, PNG, WebP, or HEIC · max 10 MB each · compressed for web (original kept) · up to{' '}
          {MAX_PHOTOS} photos
        </p>

        {/*
          Visible upload control for mobile + desktop.
          Do not use btn-secondary here — that style is white-on-glass for dark headers and is invisible on this light form.
        */}
        <div className="mt-3">
          <input
            id="job-photos-input"
            type="file"
            accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp"
            multiple
            className="sr-only"
            onChange={onPickFiles}
            disabled={busy || form.photos.length >= MAX_PHOTOS}
            aria-label="Choose photos from library or camera"
          />
          <label
            htmlFor="job-photos-input"
            className={[
              'flex w-full min-h-[3.5rem] cursor-pointer items-center justify-center gap-3 rounded-2xl px-4 py-4 text-base font-semibold shadow-sm transition active:scale-[0.99]',
              busy || form.photos.length >= MAX_PHOTOS
                ? 'pointer-events-none bg-gray-200 text-gray-500'
                : 'bg-royal-600 text-white hover:bg-royal-700',
            ].join(' ')}
          >
            <svg
              className="h-6 w-6 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Choose Photos
          </label>
          <p className="mt-2 text-center text-[0.75rem] text-gray-500 sm:text-left">
            Opens your photo library and camera options on your phone.
          </p>
        </div>

        {form.photos.length > 0 && (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {form.photos.map((photo) => (
              <li key={photo.key} className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-sm">
                <div className="relative aspect-[4/3] bg-navy-950/5">
                  {photo.heic && !photo.uploaded ? (
                    <div className="flex h-full items-center justify-center p-4 text-center text-[0.8125rem] text-gray-500">
                      HEIC selected — preview may be limited on this device. It will still upload.
                    </div>
                  ) : (
                    <img
                      src={photo.previewUrl || photo.url}
                      alt={photo.alt || 'Selected job photo'}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {!photo.uploaded && photo.progress > 0 && photo.progress < 100 && (
                    <div className="absolute inset-x-0 bottom-0 bg-navy-950/80 px-2 py-2 text-center text-[0.75rem] font-medium text-white">
                      Uploading {photo.progress}%
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <label className="block text-[0.75rem] font-medium text-gray-600">
                    Label
                    <select
                      className="input-light mt-1 !py-2.5 text-[0.875rem]"
                      value={photo.label}
                      onChange={(e) => updatePhoto(photo.key, { label: e.target.value })}
                      disabled={busy}
                    >
                      {LABEL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <input
                    className="input-light !py-2.5 text-[0.875rem]"
                    placeholder="Alt text (optional)"
                    value={photo.alt}
                    onChange={(e) => updatePhoto(photo.key, { alt: e.target.value })}
                    disabled={busy}
                    maxLength={200}
                  />
                  <button
                    type="button"
                    className="min-h-11 w-full rounded-xl border border-red-200 bg-red-50 text-[0.875rem] font-semibold text-red-700"
                    onClick={() => removePhoto(photo.key)}
                    disabled={busy}
                  >
                    Remove photo
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(form.service || form.city) && (
        <p className="mt-6 text-[0.8125rem] text-gray-500">
          Preview: {serviceLabel(form.service)} · {cityLabel(form.city)} · {form.propertyType} · {form.completedAt}
        </p>
      )}

      <div className="mt-8 mb-4 flex flex-col gap-3 sm:mb-0 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className="btn-ghost btn-md !min-h-12 w-full !rounded-xl sm:w-auto"
          disabled={busy}
          onClick={() => save('draft')}
        >
          Save as draft
        </button>
        <button
          type="button"
          className="btn-royal btn-md !min-h-12 w-full !rounded-xl sm:w-auto"
          disabled={busy}
          onClick={() => save('published')}
        >
          Publish
        </button>
        {busy && (
          <span className="self-center text-[0.875rem] text-gray-500" role="status">
            {busyLabel || 'Working…'}
          </span>
        )}
      </div>
    </div>
  )
}
