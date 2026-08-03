import { useEffect, useMemo, useState } from 'react'
import { SERVICES } from '../../config/content'
import { SERVICE_CITIES } from '../../config/serviceAreas'
import { fetchAdminFacebookStatus } from '../../services/adminApi'
import {
  buildFacebookCaptionPreview,
  canShowFacebookPublishCheckbox,
} from '../../utils/facebookCaption'
import {
  ACCEPTED_ACCEPT_ATTR,
  MAX_MEDIA_ITEMS,
  prepareMediaForUpload,
  RECOMMENDED_VIDEO_LENGTH,
  RECOMMENDED_VIDEO_SIZE,
  uploadPreparedFile,
} from '../../utils/projectPhotos'
import { inferMediaKind, isVideoMedia } from '../../../lib/projectMedia.mjs'

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
    photos: (project.photos || []).map((p, i) => {
      const kind = inferMediaKind(p)
      return {
        key: `existing-${i}-${p.url}`,
        url: p.url,
        pathname: p.pathname,
        label: p.label || 'general',
        alt: p.alt || '',
        contentType: p.contentType,
        size: p.size,
        kind,
        posterUrl: p.posterUrl || null,
        durationSeconds: p.durationSeconds ?? null,
        previewUrl: kind === 'video' ? p.posterUrl || p.url : p.url,
        uploaded: true,
        progress: 100,
        movWarning: kind === 'video' && /quicktime|\.mov/i.test(`${p.contentType || ''} ${p.url || ''}`),
      }
    }),
  }
}

function serviceLabel(slug) {
  return SERVICES.find((s) => s.slug === slug)?.title || slug
}

function cityLabel(slug) {
  return SERVICE_CITIES.find((c) => c.slug === slug)?.name || slug
}

function toPersistedPhoto(photo) {
  const kind = photo.kind || inferMediaKind(photo)
  return {
    url: photo.url,
    pathname: photo.pathname || null,
    label: photo.label,
    alt: photo.alt,
    contentType: photo.contentType || null,
    size: photo.size ?? null,
    kind,
    posterUrl: kind === 'video' ? photo.posterUrl || null : null,
    durationSeconds: kind === 'video' ? photo.durationSeconds ?? null : null,
  }
}

function formatBytes(size) {
  const n = Number(size)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
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
  const [facebookConfigured, setFacebookConfigured] = useState(false)
  const [facebookConfigLoaded, setFacebookConfigLoaded] = useState(false)
  const [postToFacebook, setPostToFacebook] = useState(false)
  const [facebookCaption, setFacebookCaption] = useState('')
  const [captionTouched, setCaptionTouched] = useState(false)

  const isPublishedEdit = mode === 'edit' && initialProject?.status === 'published'
  const showEmptyPhotoWarning = isPublishedEdit && form.photos.length === 0
  const showFacebookCheckbox = canShowFacebookPublishCheckbox(initialProject) && !isPublishedEdit
  const hasCoverPhoto = form.photos.some((item) => !isVideoMedia(item))

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
    const isVideo = isVideoMedia(target)

    const confirmed = window.confirm(
      isVideo
        ? 'Remove this video from this project? This cannot be undone.'
        : 'Remove this photo from this project? This cannot be undone.',
    )
    if (!confirmed) return

    setError('')
    setPhotoStatus({ type: '', message: '' })
    setDeletingKey(key)

    try {
      // New local picks are not in Redis/Blob yet — remove from the form only.
      if (!(mode === 'edit' && initialProject?.id && target.uploaded && target.url)) {
        dropPhotoFromForm(key)
        setPhotoStatus({
          type: 'success',
          message: isVideo ? 'Video removed from this job.' : 'Photo removed from this job.',
        })
        return
      }

      setBusy(true)
      setBusyLabel(isVideo ? 'Removing video…' : 'Removing photo…')

      const remaining = form.photos.filter((p) => p.key !== key)
      const persisted = remaining.filter((p) => p.uploaded && p.url).map(toPersistedPhoto)
      const result = await updateProject(initialProject.id, { photos: persisted })
      const project = result?.project || result

      dropPhotoFromForm(key)
      setPhotoStatus({
        type: 'success',
        message:
          remaining.length === 0
            ? 'Media removed. A placeholder will show on the public site until you add more.'
            : isVideo
              ? 'Video removed from this project.'
              : 'Photo removed from this project.',
      })
      onSaved?.(project, {
        closeEditor: false,
        seo: result?.seo || null,
        seoWarning: result?.seoWarning || null,
      })
    } catch (err) {
      const message = err.message || 'Could not remove media'
      setError(message)
      setPhotoStatus({ type: 'error', message })
    } finally {
      setDeletingKey('')
      setBusy(false)
      setBusyLabel('')
    }
  }

  async function onPickFiles(e) {
    setError('')
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return

    const remaining = MAX_MEDIA_ITEMS - form.photos.length
    if (remaining <= 0) {
      setError(`Maximum ${MAX_MEDIA_ITEMS} photos and videos per job`)
      return
    }

    const selected = files.slice(0, remaining)
    const next = []
    for (const file of selected) {
      try {
        const prepared = await prepareMediaForUpload(file)
        next.push({
          key: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: prepared.file,
          previewUrl: prepared.previewUrl,
          label: 'general',
          alt: '',
          contentType: prepared.contentType,
          kind: prepared.kind || 'photo',
          stripped: prepared.stripped,
          heic: prepared.heic,
          durationSeconds: prepared.durationSeconds ?? null,
          posterPrepared: prepared.posterPrepared || null,
          movWarning: Boolean(prepared.movWarning),
          size: prepared.file?.size ?? file.size,
          uploaded: false,
          progress: 0,
        })
      } catch (err) {
        setError(err.message || 'Could not prepare file')
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
        uploaded.push(toPersistedPhoto(photo))
        continue
      }

      const kind = photo.kind || inferMediaKind(photo)
      setBusyLabel(`Uploading ${i + 1} of ${working.length}…`)
      updatePhoto(photo.key, { progress: 1 })
      const blobMeta = await uploadPreparedFile(
        { file: photo.file, contentType: photo.contentType, kind },
        {
          onProgress: (pct) => updatePhoto(photo.key, { progress: pct }),
        },
      )

      let posterUrl = photo.posterUrl || null
      if (kind === 'video' && photo.posterPrepared?.file) {
        setBusyLabel(`Uploading poster ${i + 1} of ${working.length}…`)
        const posterMeta = await uploadPreparedFile(
          {
            file: photo.posterPrepared.file,
            contentType: photo.posterPrepared.contentType,
            kind: 'photo',
          },
          {
            onProgress: (pct) => updatePhoto(photo.key, { progress: Math.min(99, pct) }),
          },
        )
        posterUrl = posterMeta.url
      }

      updatePhoto(photo.key, {
        uploaded: true,
        progress: 100,
        url: blobMeta.url,
        pathname: blobMeta.pathname,
        contentType: blobMeta.contentType,
        size: blobMeta.size,
        kind,
        posterUrl,
      })
      working[i] = {
        ...photo,
        uploaded: true,
        url: blobMeta.url,
        pathname: blobMeta.pathname,
        kind,
        posterUrl,
        contentType: blobMeta.contentType,
        size: blobMeta.size,
      }
      uploaded.push(toPersistedPhoto(working[i]))
    }
    return uploaded
  }

  async function save(status) {
    setError('')
    setBusy(true)
    setBusyLabel(status === 'published' ? 'Publishing…' : 'Saving draft…')
    try {
      if (status === 'published' && form.photos.length === 0) {
        throw new Error('Add at least one photo or video before publishing')
      }
      if (
        status === 'published' &&
        showFacebookCheckbox &&
        postToFacebook &&
        facebookConfigured &&
        !hasCoverPhoto
      ) {
        throw new Error('Facebook posting needs a cover photo. Add a photo, or turn off Facebook posting.')
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

      let result
      if (mode === 'edit' && initialProject?.id) {
        result = await updateProject(initialProject.id, payload)
      } else {
        result = await createProject(payload)
      }
      // Support both legacy project-only returns and { project, seo, seoWarning }.
      const project = result?.project || result
      onSaved?.(project, {
        closeEditor: true,
        seo: result?.seo || null,
        seoWarning: result?.seoWarning || null,
      })
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
          Photos &amp; videos ({form.photos.length}/{MAX_MEDIA_ITEMS})
        </p>
        <p className="mt-1 text-[0.75rem] text-gray-500">
          Photos: JPEG, PNG, WebP, or HEIC · max 10 MB. Videos: MP4, MOV (iPhone), or WebM · max 100 MB.
          Up to {MAX_MEDIA_ITEMS} items total. {RECOMMENDED_VIDEO_LENGTH} {RECOMMENDED_VIDEO_SIZE}
        </p>
        <p className="mt-1 text-[0.75rem] text-gray-500">
          First photo is the cover image (used for Facebook). Videos keep their place in your saved order with
          the job’s photos.
        </p>

        {showEmptyPhotoWarning && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-900" role="status">
            Warning: this published project has no media. A professional placeholder is shown on the public site until you upload a photo or video.
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

        <div className="mt-3">
          <input
            id="job-media-input"
            type="file"
            accept={ACCEPTED_ACCEPT_ATTR}
            multiple
            className="sr-only"
            onChange={onPickFiles}
            disabled={busy || form.photos.length >= MAX_MEDIA_ITEMS}
            aria-label="Choose photos or videos from library or camera"
          />
          <label
            htmlFor="job-media-input"
            className={[
              'flex w-full min-h-[3.5rem] cursor-pointer items-center justify-center gap-3 rounded-2xl px-4 py-4 text-base font-semibold shadow-sm transition active:scale-[0.99]',
              busy || form.photos.length >= MAX_MEDIA_ITEMS
                ? 'pointer-events-none bg-gray-200 text-gray-500'
                : 'bg-royal-600 text-white hover:bg-royal-700',
            ].join(' ')}
          >
            Choose Photos or Videos
          </label>
          <p className="mt-2 text-center text-[0.75rem] text-gray-500 sm:text-left">
            Opens your library and camera/video options on your phone. Uploads go directly to secure storage.
          </p>
        </div>

        {form.photos.length > 0 && (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {form.photos.map((photo, index) => {
              const isDeleting = deletingKey === photo.key
              const controlsDisabled = busy || Boolean(deletingKey)
              const isVideo = isVideoMedia(photo)
              const isCover = !isVideo && form.photos.findIndex((item) => !isVideoMedia(item)) === index
              return (
                <li key={photo.key} className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-sm">
                  <div className="relative aspect-[4/3] bg-navy-950/5">
                    {isVideo ? (
                      <video
                        src={photo.url || photo.previewUrl}
                        poster={photo.posterUrl || undefined}
                        className="h-full w-full object-cover"
                        controls
                        playsInline
                        preload="metadata"
                      />
                    ) : photo.heic && !photo.uploaded ? (
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
                    <span className="absolute top-2 left-2 rounded-full bg-navy-950/80 px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide text-white uppercase">
                      {isCover ? 'Cover' : isVideo ? 'Video' : 'Photo'}
                    </span>
                    <button
                      type="button"
                      className="absolute top-2 right-2 z-[1] flex h-11 w-11 items-center justify-center rounded-full border border-red-200 bg-white/95 text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => confirmAndRemovePhoto(photo.key)}
                      disabled={controlsDisabled}
                      aria-label={isVideo ? 'Delete video' : 'Delete photo'}
                      title={isVideo ? 'Delete video' : 'Delete photo'}
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
                        {photo.size ? ` · ${formatBytes(photo.size)}` : ''}
                      </div>
                    )}
                    {photo.uploaded && photo.size ? (
                      <div className="absolute inset-x-0 bottom-0 bg-navy-950/55 px-2 py-1 text-center text-[0.7rem] text-white">
                        {formatBytes(photo.size)}
                        {isVideo && photo.durationSeconds
                          ? ` · ${Math.round(photo.durationSeconds)}s`
                          : ''}
                      </div>
                    ) : null}
                    {isDeleting && (
                      <div className="absolute inset-0 flex items-center justify-center bg-navy-950/45 text-[0.8125rem] font-semibold text-white">
                        Removing…
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    {photo.movWarning ? (
                      <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-[0.7rem] text-amber-900">
                        iPhone MOV may not play in some desktop browsers. Prefer an MP4 (H.264) export for widest
                        playback — no paid conversion is used.
                      </p>
                    ) : null}
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
                      placeholder={isVideo ? 'Video description (optional)' : 'Alt text (optional)'}
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
                      {isDeleting ? 'Removing…' : isVideo ? 'Delete video' : 'Delete photo'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
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
