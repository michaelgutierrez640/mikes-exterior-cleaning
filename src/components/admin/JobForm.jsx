import { useEffect, useMemo, useRef, useState } from 'react'
import { SERVICES } from '../../config/content'
import { SERVICE_CITIES } from '../../config/serviceAreas'
import { cleanupAdminOrphanBlobs, fetchAdminFacebookStatus } from '../../services/adminApi'
import {
  buildFacebookCaptionPreview,
  canShowFacebookPublishCheckbox,
} from '../../utils/facebookCaption'
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
      previewUrl: p.url,
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

function toPersistedPhoto(photo) {
  return {
    url: photo.url,
    pathname: photo.pathname || null,
    label: photo.label,
    alt: photo.alt,
    contentType: photo.contentType || null,
    size: photo.size ?? null,
  }
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
  const [photoStatus, setPhotoStatus] = useState({ type: '', message: '' })
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [deletingKey, setDeletingKey] = useState('')
  const [addingPhotos, setAddingPhotos] = useState(false)
  const pickInFlightRef = useRef(false)
  const [facebookConfigured, setFacebookConfigured] = useState(false)
  const [facebookConfigLoaded, setFacebookConfigLoaded] = useState(false)
  const [postToFacebook, setPostToFacebook] = useState(false)
  const [facebookCaption, setFacebookCaption] = useState('')
  const [captionTouched, setCaptionTouched] = useState(false)

  const isPublishedEdit = mode === 'edit' && initialProject?.status === 'published'
  const showEmptyPhotoWarning = isPublishedEdit && form.photos.length === 0
  const showFacebookCheckbox = canShowFacebookPublishCheckbox(initialProject) && !isPublishedEdit

  const defaultCaption = useMemo(
    () =>
      buildFacebookCaptionPreview({
        service: form.service,
        city: form.city,
        notes: form.notes,
        slug: initialProject?.slug || '',
      }),
    [form.service, form.city, form.notes, initialProject?.slug],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchAdminFacebookStatus()
        if (!cancelled) {
          setFacebookConfigured(Boolean(data.configured))
          setFacebookConfigLoaded(true)
        }
      } catch {
        if (!cancelled) {
          setFacebookConfigured(false)
          setFacebookConfigLoaded(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!captionTouched) setFacebookCaption(defaultCaption)
  }, [defaultCaption, captionTouched])

  useEffect(() => {
    if (!facebookConfigured || !showFacebookCheckbox) setPostToFacebook(false)
  }, [facebookConfigured, showFacebookCheckbox])

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updatePhoto(key, patch) {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    }))
  }

  /** Like updatePhoto, but inserts `fallback` if the key is not in state yet (avoids race after staging). */
  function upsertPhoto(key, patch, fallback = null) {
    setForm((prev) => {
      const exists = prev.photos.some((p) => p.key === key)
      if (!exists) {
        if (!fallback) return prev
        return { ...prev, photos: [...prev.photos, { ...fallback, ...patch }] }
      }
      return {
        ...prev,
        photos: prev.photos.map((p) => (p.key === key ? { ...p, ...patch } : p)),
      }
    })
  }

  function dropPhotoFromForm(key) {
    setForm((prev) => {
      const target = prev.photos.find((p) => p.key === key)
      if (target?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(target.previewUrl)
      return { ...prev, photos: prev.photos.filter((p) => p.key !== key) }
    })
  }

  async function confirmAndRemovePhoto(key) {
    if (busy || deletingKey) return
    const target = form.photos.find((p) => p.key === key)
    if (!target) return

    const confirmed = window.confirm('Remove this photo from this project? This cannot be undone.')
    if (!confirmed) return

    setError('')
    setPhotoStatus({ type: '', message: '' })
    setDeletingKey(key)

    try {
      // New local picks are not in Redis/Blob yet — remove from the form only.
      if (!(mode === 'edit' && initialProject?.id && target.uploaded && target.url)) {
        dropPhotoFromForm(key)
        setPhotoStatus({ type: 'success', message: 'Photo removed from this job.' })
        return
      }

      setBusy(true)
      setBusyLabel('Removing photo…')

      const remaining = form.photos.filter((p) => p.key !== key)
      const persisted = remaining.filter((p) => p.uploaded && p.url).map(toPersistedPhoto)
      const project = await updateProject(initialProject.id, { photos: persisted })

      dropPhotoFromForm(key)
      setPhotoStatus({
        type: 'success',
        message:
          remaining.length === 0
            ? 'Photo removed. This project has no photos left — a placeholder will show on the public site until you add more.'
            : 'Photo removed from this project.',
      })
      onSaved?.(project, { closeEditor: false })
    } catch (err) {
      const message = err.message || 'Could not remove photo'
      setError(message)
      setPhotoStatus({ type: 'error', message })
    } finally {
      setDeletingKey('')
      setBusy(false)
      setBusyLabel('')
    }
  }

  async function cleanupFailedUploadUrls(urls) {
    const list = [...new Set((urls || []).map((u) => String(u || '').trim()).filter(Boolean))]
    if (!list.length) return
    try {
      await cleanupAdminOrphanBlobs(list)
    } catch (cleanupErr) {
      console.warn('[JobForm] orphan blob cleanup failed', cleanupErr?.message || cleanupErr)
    }
  }

  async function onPickFiles(e) {
    // Prevent double-tap / overlapping pick handlers from starting duplicate uploads.
    if (busy || deletingKey || addingPhotos || pickInFlightRef.current) {
      e.target.value = ''
      return
    }

    setError('')
    setPhotoStatus({ type: '', message: '' })
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return

    pickInFlightRef.current = true

    const remaining = MAX_PHOTOS - form.photos.length
    if (remaining <= 0) {
      const message = `Maximum ${MAX_PHOTOS} photos per job`
      setError(message)
      setPhotoStatus({ type: 'error', message })
      pickInFlightRef.current = false
      return
    }

    const selected = files.slice(0, remaining)
    const truncated = files.length > remaining

    // Create flow: stage locally until Save / Publish (same as before).
    if (!(mode === 'edit' && initialProject?.id && typeof updateProject === 'function')) {
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
            uploaded: false,
            progress: 0,
          })
        } catch (err) {
          const message = err.message || 'Could not prepare photo'
          setError(message)
          setPhotoStatus({ type: 'error', message })
        }
      }
      if (next.length) {
        setForm((prev) => ({ ...prev, photos: [...prev.photos, ...next] }))
        setPhotoStatus({
          type: 'success',
          message: truncated
            ? `Added ${next.length} photo${next.length === 1 ? '' : 's'} (max ${MAX_PHOTOS}). Save or publish to upload.`
            : `Added ${next.length} photo${next.length === 1 ? '' : 's'}. Save or publish to upload.`,
        })
      }
      pickInFlightRef.current = false
      return
    }

    // Edit flow: optimize → upload → persist immediately (append; cover stays photos[0]).
    setAddingPhotos(true)
    setBusy(true)
    setBusyLabel(`Preparing ${selected.length} photo${selected.length === 1 ? '' : 's'}…`)

    const staged = []
    const prepareErrors = []
    for (const file of selected) {
      try {
        const prepared = await prepareImageForUpload(file)
        staged.push({
          key: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: prepared.file,
          previewUrl: prepared.previewUrl,
          label: 'general',
          alt: '',
          contentType: prepared.contentType,
          stripped: prepared.stripped,
          heic: prepared.heic,
          uploaded: false,
          progress: 0,
        })
      } catch (err) {
        prepareErrors.push(err.message || `Could not prepare ${file.name || 'photo'}`)
      }
    }

    if (!staged.length) {
      const message = prepareErrors[0] || 'Could not prepare photos'
      setError(message)
      setPhotoStatus({ type: 'error', message })
      setAddingPhotos(false)
      setBusy(false)
      setBusyLabel('')
      pickInFlightRef.current = false
      return
    }

    setForm((prev) => ({ ...prev, photos: [...prev.photos, ...staged] }))

    const uploadedNew = []
    const uploadedUrls = []
    try {
      for (let i = 0; i < staged.length; i += 1) {
        const photo = staged[i]
        setBusyLabel(`Uploading ${i + 1} of ${staged.length}…`)
        upsertPhoto(photo.key, { progress: 1 }, photo)
        try {
          const blobMeta = await uploadPreparedFile(
            { file: photo.file, contentType: photo.contentType },
            { onProgress: (pct) => upsertPhoto(photo.key, { progress: pct }, photo) },
          )
          uploadedUrls.push(blobMeta.url)
          const persisted = {
            key: photo.key,
            url: blobMeta.url,
            pathname: blobMeta.pathname,
            label: photo.label,
            alt: photo.alt,
            contentType: blobMeta.contentType,
            size: blobMeta.size,
            previewUrl: blobMeta.url,
            uploaded: true,
            progress: 100,
            heic: false,
          }
          uploadedNew.push(persisted)
          upsertPhoto(
            photo.key,
            {
              uploaded: true,
              progress: 100,
              url: blobMeta.url,
              pathname: blobMeta.pathname,
              contentType: blobMeta.contentType,
              size: blobMeta.size,
              previewUrl: blobMeta.url,
              file: undefined,
            },
            photo,
          )
          if (photo.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(photo.previewUrl)
        } catch (uploadErr) {
          dropPhotoFromForm(photo.key)
          throw new Error(uploadErr.message || `Upload failed for photo ${i + 1}`)
        }
      }

      setBusyLabel('Saving photos to this project…')
      const existingPersisted = form.photos.filter((p) => p.uploaded && p.url).map(toPersistedPhoto)
      const newPersisted = uploadedNew.map(toPersistedPhoto)
      // Append only — do not reorder, so the existing cover (first photo) is preserved.
      const project = await updateProject(initialProject.id, {
        photos: [...existingPersisted, ...newPersisted],
      })

      setForm(formFromProject(project))
      const count = uploadedNew.length
      const parts = [
        `Added ${count} photo${count === 1 ? '' : 's'} to this project.`,
      ]
      if (truncated) parts.push(`Only the first ${remaining} fit within the ${MAX_PHOTOS}-photo limit.`)
      if (prepareErrors.length) parts.push(`${prepareErrors.length} file${prepareErrors.length === 1 ? '' : 's'} could not be prepared.`)
      setPhotoStatus({ type: 'success', message: parts.join(' ') })
      onSaved?.(project, { closeEditor: false })
    } catch (err) {
      await cleanupFailedUploadUrls(uploadedUrls)
      for (const photo of staged) {
        dropPhotoFromForm(photo.key)
      }
      const message = err.message || 'Could not add photos'
      setError(message)
      setPhotoStatus({
        type: 'error',
        message: `${message} Incomplete uploads were cleaned up when possible.`,
      })
    } finally {
      setAddingPhotos(false)
      setBusy(false)
      setBusyLabel('')
      pickInFlightRef.current = false
    }
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
        })
        continue
      }

      setBusyLabel(`Uploading ${i + 1} of ${working.length}…`)
      updatePhoto(photo.key, { progress: 1 })
      const blobMeta = await uploadPreparedFile(
        { file: photo.file, contentType: photo.contentType },
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
      })
      working[i] = { ...photo, uploaded: true, url: blobMeta.url, pathname: blobMeta.pathname }
      uploaded.push({
        url: blobMeta.url,
        pathname: blobMeta.pathname,
        label: photo.label,
        alt: photo.alt,
        contentType: blobMeta.contentType,
        size: blobMeta.size,
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

      if (status === 'published' && showFacebookCheckbox && postToFacebook && facebookConfigured) {
        payload.postToFacebook = true
        payload.facebookCaption = (facebookCaption || defaultCaption).trim()
      }

      let project
      if (mode === 'edit' && initialProject?.id) {
        project = await updateProject(initialProject.id, payload)
      } else {
        project = await createProject(payload)
      }
      onSaved?.(project, { closeEditor: true })
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
          JPEG, PNG, WebP, or HEIC · max 10 MB each · up to {MAX_PHOTOS} photos. The first photo is the cover
          image
          {mode === 'edit'
            ? ' and stays the cover when you add more. New photos upload immediately to this project.'
            : '.'}
        </p>

        {showEmptyPhotoWarning && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-900" role="status">
            Warning: this published project has no photos. A professional placeholder is shown on the public site until you upload a new photo.
          </p>
        )}

        {photoStatus.message && (
          <p
            className={[
              'mt-3 rounded-xl px-4 py-3 text-[0.875rem]',
              photoStatus.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800',
            ].join(' ')}
            role={photoStatus.type === 'error' ? 'alert' : 'status'}
          >
            {photoStatus.message}
          </p>
        )}

        {/*
          Visible Add Photos control for mobile + desktop.
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
            disabled={busy || addingPhotos || Boolean(deletingKey) || form.photos.length >= MAX_PHOTOS}
            aria-label="Add photos from library or camera"
          />
          <label
            htmlFor="job-photos-input"
            className={[
              'flex w-full min-h-[3.5rem] cursor-pointer items-center justify-center gap-3 rounded-2xl px-4 py-4 text-base font-semibold shadow-sm transition active:scale-[0.99]',
              busy || addingPhotos || Boolean(deletingKey) || form.photos.length >= MAX_PHOTOS
                ? 'pointer-events-none bg-gray-200 text-gray-500'
                : 'bg-royal-600 text-white hover:bg-royal-700',
            ].join(' ')}
          >
            {addingPhotos ? (
              <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
            ) : (
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
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
            {addingPhotos ? 'Adding Photos…' : 'Add Photos'}
          </label>
          <p className="mt-2 text-center text-[0.75rem] text-gray-500 sm:text-left">
            {mode === 'edit'
              ? 'Select one or more photos from your phone or computer. They upload right away — no republish or Facebook post.'
              : 'Opens your photo library and camera options. Photos upload when you save or publish.'}
          </p>
        </div>

        {form.photos.length > 0 && (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {form.photos.map((photo, index) => {
              const isDeleting = deletingKey === photo.key
              const controlsDisabled = busy || addingPhotos || Boolean(deletingKey)
              return (
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
                    {index === 0 && (
                      <span className="absolute top-2 left-2 rounded-full bg-navy-950/80 px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide text-white uppercase">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      className="absolute top-2 right-2 z-[1] flex h-11 w-11 items-center justify-center rounded-full border border-red-200 bg-white/95 text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => confirmAndRemovePhoto(photo.key)}
                      disabled={controlsDisabled}
                      aria-label="Delete photo"
                      title="Delete photo"
                    >
                      {isDeleting ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-red-200 border-t-red-600" aria-hidden="true" />
                      ) : (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M3 6h18" strokeLinecap="round" />
                          <path d="M8 6V4h8v2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                    {!photo.uploaded && photo.progress > 0 && photo.progress < 100 && (
                      <div className="absolute inset-x-0 bottom-0 bg-navy-950/80 px-2 py-2 text-center text-[0.75rem] font-medium text-white">
                        Uploading {photo.progress}%
                      </div>
                    )}
                    {isDeleting && (
                      <div className="absolute inset-0 flex items-center justify-center bg-navy-950/45 text-[0.8125rem] font-semibold text-white">
                        Removing…
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
                        disabled={controlsDisabled}
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
                      disabled={controlsDisabled}
                      maxLength={200}
                    />
                    <button
                      type="button"
                      className="min-h-11 w-full rounded-xl border border-red-200 bg-red-50 text-[0.875rem] font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => confirmAndRemovePhoto(photo.key)}
                      disabled={controlsDisabled}
                    >
                      {isDeleting ? 'Removing…' : 'Delete photo'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {form.photos.length > 0 && form.photos.length < MAX_PHOTOS && (
          <div className="mt-4">
            <label
              htmlFor="job-photos-input"
              className={[
                'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[0.875rem] font-semibold transition',
                busy || addingPhotos || Boolean(deletingKey)
                  ? 'pointer-events-none border-gray-200 bg-gray-100 text-gray-400'
                  : 'border-royal-200 bg-royal-50 text-royal-800 hover:bg-royal-100',
              ].join(' ')}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              {addingPhotos ? 'Adding Photos…' : 'Add Photos'}
            </label>
          </div>
        )}
      </div>

      {(form.service || form.city) && (
        <p className="mt-6 text-[0.8125rem] text-gray-500">
          Preview: {serviceLabel(form.service)} · {cityLabel(form.city)} · {form.propertyType} · {form.completedAt}
        </p>
      )}

      {showFacebookCheckbox && (
        <div className="mt-6 rounded-2xl border border-black/[0.08] bg-gray-50/80 p-4 sm:p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 rounded border-gray-300 text-royal-600 focus:ring-royal-500 disabled:cursor-not-allowed disabled:opacity-50"
              checked={postToFacebook && facebookConfigured}
              disabled={busy || !facebookConfigured || !facebookConfigLoaded}
              onChange={(e) => setPostToFacebook(e.target.checked)}
            />
            <span className="min-w-0">
              <span className="block text-[0.9375rem] font-semibold text-navy-900">Post this project to Facebook</span>
              <span className="mt-1 block text-[0.8125rem] leading-relaxed text-gray-600">
                {facebookConfigLoaded && !facebookConfigured
                  ? 'Connect Facebook to enable automatic posting.'
                  : "Uses the cover photo and posts to the Mike's Exterior Cleaning Services Facebook Page after the website job publishes."}
              </span>
            </span>
          </label>

          {postToFacebook && facebookConfigured && (
            <label className="mt-4 block">
              <span className="mb-2 block text-[0.8125rem] font-medium text-gray-600">Facebook caption preview</span>
              <textarea
                className="input-light min-h-[9rem] resize-y font-mono text-[0.8125rem] leading-relaxed"
                value={facebookCaption}
                onChange={(e) => {
                  setCaptionTouched(true)
                  setFacebookCaption(e.target.value)
                }}
                disabled={busy}
                maxLength={2000}
              />
              <span className="mt-1 block text-[0.75rem] text-gray-500">
                Keep it short: service, city, a one-line teaser, and the project page link. The cover photo is used for the
                post — avoid pasting the full job description.
              </span>
            </label>
          )}
        </div>
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
