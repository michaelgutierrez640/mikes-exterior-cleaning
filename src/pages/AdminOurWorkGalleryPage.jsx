import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminAuthGate from '../components/admin/AdminAuthGate'
import AdminNav from '../components/admin/AdminNav'
import SeoHead from '../components/seo/SeoHead'
import { absoluteUrl } from '../config/site'
import { fetchAdminOurWorkGallery, removeAdminOurWorkStaticPhoto } from '../services/adminApi'
import { cityLabel, serviceLabel } from '../utils/projectLabels'

function PhotoCard({ photo, busyKey, onDelete }) {
  const isBusy = busyKey === photo.id
  const disabled = Boolean(busyKey)

  return (
    <li className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-navy-950/5">
        <img
          src={photo.src}
          alt={photo.alt || 'Our Work gallery photo'}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <span
          className={[
            'absolute top-2 left-2 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide uppercase',
            photo.kind === 'published-job' ? 'bg-emerald-600 text-white' : 'bg-navy-900 text-white',
          ].join(' ')}
        >
          {photo.label}
        </span>
        {photo.canDelete && (
          <button
            type="button"
            className="absolute top-2 right-2 z-[1] flex h-11 w-11 items-center justify-center rounded-full border border-red-200 bg-white/95 text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => onDelete(photo)}
            disabled={disabled}
            aria-label="Remove from Our Work gallery"
            title="Remove from Our Work"
          >
            {isBusy ? (
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
        )}
        {isBusy && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy-950/45 text-[0.8125rem] font-semibold text-white">
            Removing…
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <p className="line-clamp-2 text-[0.875rem] text-gray-700">{photo.alt || photo.src}</p>
        {photo.kind === 'published-job' ? (
          <p className="text-[0.75rem] text-gray-500">
            {serviceLabel(photo.service)} · {cityLabel(photo.city)}
            {photo.photoLabel ? ` · ${photo.photoLabel}` : ''}
          </p>
        ) : (
          <p className="text-[0.75rem] text-gray-500">
            {(photo.categories || []).join(', ') || 'Static gallery'}
            {photo.pairLabel ? ` · ${photo.pairLabel}` : ''}
          </p>
        )}
        {photo.canDelete ? (
          <button
            type="button"
            className="min-h-11 w-full rounded-xl border border-red-200 bg-red-50 text-[0.875rem] font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => onDelete(photo)}
            disabled={disabled}
          >
            {isBusy ? 'Removing…' : 'Remove from Our Work'}
          </button>
        ) : (
          <Link
            to={photo.manageHref || '/admin/completed-jobs/published'}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-black/[0.08] bg-gray-50 text-[0.875rem] font-semibold text-navy-900 hover:bg-gray-100"
          >
            Manage in Published Job
          </Link>
        )}
      </div>
    </li>
  )
}

function GalleryBody({ setUnauthorized }) {
  const [photos, setPhotos] = useState([])
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [busyKey, setBusyKey] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminOurWorkGallery()
      setPhotos(data.photos || [])
      setCounts(data.counts || null)
    } catch (err) {
      if (err.unauthorized) {
        setUnauthorized?.(true)
        return
      }
      setError(err.message || 'Could not load Our Work gallery')
    } finally {
      setLoading(false)
    }
  }, [setUnauthorized])

  useEffect(() => {
    load()
  }, [load])

  async function onDelete(photo) {
    if (!photo?.canDelete || busyKey) return
    const confirmed = window.confirm(
      'Remove this photo from Our Work? This does not delete any Published Job. If the image is used elsewhere on the site, the file will be kept.',
    )
    if (!confirmed) return

    setBusyKey(photo.id)
    setStatus({ type: '', message: '' })
    setError('')
    try {
      const result = await removeAdminOurWorkStaticPhoto(photo.src)
      setStatus({
        type: 'success',
        message: result.message || 'Photo removed from Our Work.',
      })
      await load()
    } catch (err) {
      if (err.unauthorized) {
        setUnauthorized?.(true)
        return
      }
      const message = err.message || 'Could not remove photo'
      setError(message)
      setStatus({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  return (
    <div className="space-y-6">
      <AdminNav activeArea="gallery" />

      <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="font-display text-xl font-semibold text-navy-900">Manage Our Work Gallery</h2>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-gray-600">
          Review every photo that appears in the homepage Our Work gallery. Static gallery photos can be removed here.
          Published Job photos are listed for reference — delete those from the job editor so the project stays intact.
        </p>
        {counts && (
          <p className="mt-3 text-[0.8125rem] text-gray-500">
            Visible static: {counts.staticVisible} · Published Job photos: {counts.publishedJob}
            {typeof counts.hidden === 'number' ? ` · Hidden static: ${counts.hidden}` : ''}
          </p>
        )}
      </div>

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

      {loading ? (
        <p className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center text-gray-500">Loading gallery…</p>
      ) : photos.length === 0 ? (
        <p className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center text-gray-500">
          No visible Our Work photos right now.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} busyKey={busyKey} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </div>
  )
}

export default function AdminOurWorkGalleryPage() {
  return (
    <>
      <SeoHead
        title="Admin · Manage Our Work Gallery"
        description="Private Our Work gallery manager for Mike's Exterior Cleaning Services."
        canonical={absoluteUrl('/admin/our-work-gallery')}
        noindex
      />

      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="section-container">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">Private</p>
          <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">Our Work Gallery</h1>
          <p className="mt-2 font-mono text-[0.75rem] text-royal-200/80">/admin/our-work-gallery</p>
        </div>
      </section>

      <section className="section-container -mt-6 pb-24">
        <AdminAuthGate>
          {({ setUnauthorized }) => <GalleryBody setUnauthorized={setUnauthorized} />}
        </AdminAuthGate>
      </section>
    </>
  )
}
