import { useRef, useState } from 'react'
import { SERVICE_CITIES } from '../../config/serviceAreas'
import { CATEGORY_TITLES } from '../../config/imagePlacement'
import {
  addAdminOurWorkGalleryPhotos,
  cleanupAdminOurWorkGalleryOrphans,
} from '../../services/adminApi'
import {
  MAX_PHOTOS,
  prepareImageForUpload,
  uploadPreparedGalleryFile,
} from '../../utils/projectPhotos'

const SERVICE_OPTIONS = [
  'window-cleaning',
  'solar-panel-cleaning',
  'pressure-washing',
  'roof-cleaning',
  'gutter-cleaning',
  'luxury-homes',
  'transformations',
  'pigeon-guard',
]

const LABEL_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
]

export default function OurWorkGalleryUpload({ disabled = false, onUploaded, onUnauthorized }) {
  const inputRef = useRef(null)
  const inFlightRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('window-cleaning')
  const [city, setCity] = useState('')
  const [photoLabel, setPhotoLabel] = useState('general')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })

  const controlsLocked = disabled || busy || inFlightRef.current

  async function onPickFiles(e) {
    if (controlsLocked || inFlightRef.current) {
      e.target.value = ''
      return
    }

    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return

    inFlightRef.current = true
    setBusy(true)
    setError('')
    setStatus({ type: '', message: '' })
    setProgress(null)

    const selected = files.slice(0, MAX_PHOTOS)
    const truncated = files.length > selected.length
    const uploadedPayload = []
    const uploadedUrls = []

    try {
      for (let i = 0; i < selected.length; i += 1) {
        const file = selected[i]
        setBusyLabel(`Preparing ${i + 1} of ${selected.length}…`)
        const prepared = await prepareImageForUpload(file)
        setBusyLabel(`Uploading ${i + 1} of ${selected.length}…`)
        setProgress({ index: i + 1, total: selected.length, pct: 1 })

        const blobMeta = await uploadPreparedGalleryFile(
          { file: prepared.file, contentType: prepared.contentType },
          {
            onProgress: (pct) => setProgress({ index: i + 1, total: selected.length, pct }),
          },
        )
        uploadedUrls.push(blobMeta.url)
        if (prepared.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(prepared.previewUrl)

        uploadedPayload.push({
          src: blobMeta.url,
          pathname: blobMeta.pathname,
          category,
          city: city || null,
          photoLabel,
          caption: caption.trim(),
          alt: caption.trim() || `${CATEGORY_TITLES[category] || category} — Our Work`,
          contentType: blobMeta.contentType,
          size: blobMeta.size,
        })
      }

      setBusyLabel('Saving to Our Work gallery…')
      setProgress(null)
      const result = await addAdminOurWorkGalleryPhotos(uploadedPayload)
      const count = result.added?.length || uploadedPayload.length
      setStatus({
        type: 'success',
        message: [
          result.message || `Added ${count} photo${count === 1 ? '' : 's'} to Our Work.`,
          truncated ? `Only the first ${MAX_PHOTOS} files were uploaded.` : '',
        ]
          .filter(Boolean)
          .join(' '),
      })
      setCaption('')
      onUploaded?.(result)
    } catch (err) {
      if (uploadedUrls.length) {
        try {
          await cleanupAdminOurWorkGalleryOrphans(uploadedUrls)
        } catch {
          /* ignore cleanup errors */
        }
      }
      if (err.unauthorized) {
        onUnauthorized?.()
        return
      }
      setError(err.message || 'Could not add photos to Our Work')
      setStatus({
        type: 'error',
        message: `${err.message || 'Upload failed'}. Incomplete uploads were cleaned up when possible.`,
      })
    } finally {
      setBusy(false)
      setBusyLabel('')
      setProgress(null)
      inFlightRef.current = false
    }
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy-900">Add Photos to Our Work</h2>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-gray-600">
            Upload photos directly to the public Our Work gallery. This does not create a Completed Job,
            project page, or Facebook post.
          </p>
        </div>
        <button
          type="button"
          className="btn-royal btn-md !min-h-12 !rounded-xl"
          disabled={controlsLocked}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Hide upload form' : 'Add Photos'}
        </button>
      </div>

      {open && (
        <div className="mt-6 space-y-4 border-t border-black/[0.06] pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[0.8125rem] font-medium text-gray-600">Service category</span>
              <select
                className="input-light"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={controlsLocked}
              >
                {SERVICE_OPTIONS.map((slug) => (
                  <option key={slug} value={slug}>
                    {CATEGORY_TITLES[slug] || slug}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[0.8125rem] font-medium text-gray-600">City (optional)</span>
              <select
                className="input-light"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={controlsLocked}
              >
                <option value="">No city</option>
                {SERVICE_CITIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[0.8125rem] font-medium text-gray-600">Photo type</span>
              <select
                className="input-light"
                value={photoLabel}
                onChange={(e) => setPhotoLabel(e.target.value)}
                disabled={controlsLocked}
              >
                {LABEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-2 block text-[0.8125rem] font-medium text-gray-600">
                Short caption (optional)
              </span>
              <input
                className="input-light"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={200}
                placeholder="Shown as the photo description on Our Work"
                disabled={controlsLocked}
              />
            </label>
          </div>

          <input
            ref={inputRef}
            id="our-work-gallery-upload"
            type="file"
            accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp"
            multiple
            className="sr-only"
            onChange={onPickFiles}
            disabled={controlsLocked}
            aria-label="Add photos to Our Work gallery"
          />
          <label
            htmlFor="our-work-gallery-upload"
            className={[
              'flex w-full min-h-[3.5rem] cursor-pointer items-center justify-center gap-3 rounded-2xl px-4 py-4 text-base font-semibold shadow-sm transition active:scale-[0.99]',
              controlsLocked
                ? 'pointer-events-none bg-gray-200 text-gray-500'
                : 'bg-royal-600 text-white hover:bg-royal-700',
            ].join(' ')}
          >
            {busy ? (
              <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
            ) : (
              <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            )}
            {busy ? busyLabel || 'Uploading…' : 'Choose Photos'}
          </label>
          <p className="text-[0.75rem] text-gray-500">
            JPEG, PNG, WebP, or HEIC · up to {MAX_PHOTOS} at a time · optimized before upload. Works on phone and desktop.
          </p>

          {progress && (
            <p className="rounded-xl bg-navy-950/5 px-4 py-3 text-[0.875rem] text-navy-900" role="status">
              Uploading photo {progress.index} of {progress.total}
              {progress.pct ? ` — ${progress.pct}%` : ''}
            </p>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700" role="alert">
              {error}
            </p>
          )}
          {status.message && (
            <p
              className={[
                'rounded-xl px-4 py-3 text-[0.875rem]',
                status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800',
              ].join(' ')}
              role={status.type === 'error' ? 'alert' : 'status'}
            >
              {status.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
