import { useCallback, useEffect, useRef, useState } from 'react'

const LABEL_TEXT = {
  before: 'Before',
  after: 'After',
  general: 'General',
}

/**
 * Mobile-friendly admin photo gallery with thumbnails, prev/next, and enlarge.
 */
export default function JobPhotoGallery({ photos = [] }) {
  const ordered = [...photos].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const touchStartX = useRef(null)

  useEffect(() => {
    setIndex(0)
  }, [photos])

  const count = ordered.length
  const current = ordered[index] || null

  const go = useCallback(
    (next) => {
      if (!count) return
      setIndex(((next % count) + count) % count)
    },
    [count],
  )

  useEffect(() => {
    if (!lightbox) return undefined
    function onKey(e) {
      if (e.key === 'Escape') setLightbox(false)
      if (e.key === 'ArrowLeft') go(index - 1)
      if (e.key === 'ArrowRight') go(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, index, go])

  if (!count) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center text-[0.875rem] text-gray-500">
        No photos on this job.
      </div>
    )
  }

  function onTouchStart(e) {
    touchStartX.current = e.changedTouches?.[0]?.clientX ?? null
  }

  function onTouchEnd(e) {
    const start = touchStartX.current
    const end = e.changedTouches?.[0]?.clientX ?? null
    touchStartX.current = null
    if (start == null || end == null) return
    const delta = end - start
    if (Math.abs(delta) < 40) return
    if (delta < 0) go(index + 1)
    else go(index - 1)
  }

  const stage = (
    <div
      className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-navy-950/5 sm:aspect-[16/10]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        className="absolute inset-0 z-[1]"
        onClick={() => setLightbox(true)}
        aria-label="Enlarge photo"
      />
      <img
        src={current.url}
        alt={current.alt || LABEL_TEXT[current.label] || 'Job photo'}
        className="h-full w-full object-contain bg-navy-950/[0.03] sm:object-cover"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/70 to-transparent px-4 py-3">
        <p className="text-[0.8125rem] font-semibold text-white">
          {LABEL_TEXT[current.label] || 'Photo'} · {index + 1} of {count}
        </p>
      </div>
      {count > 1 && (
        <>
          <button
            type="button"
            className="absolute top-1/2 left-2 z-[2] min-h-11 min-w-11 -translate-y-1/2 rounded-full bg-white/95 text-navy-900 shadow"
            onClick={(e) => {
              e.stopPropagation()
              go(index - 1)
            }}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute top-1/2 right-2 z-[2] min-h-11 min-w-11 -translate-y-1/2 rounded-full bg-white/95 text-navy-900 shadow"
            onClick={(e) => {
              e.stopPropagation()
              go(index + 1)
            }}
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-3">
      {stage}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {ordered.map((photo, i) => (
          <button
            key={`${photo.url}-${i}`}
            type="button"
            onClick={() => setIndex(i)}
            className={[
              'relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2',
              i === index ? 'border-royal-600' : 'border-transparent opacity-80',
            ].join(' ')}
            aria-label={`${LABEL_TEXT[photo.label] || 'Photo'} thumbnail ${i + 1}`}
            aria-current={i === index ? 'true' : undefined}
          >
            <img src={photo.url} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-navy-950/70 px-1 py-0.5 text-[0.6rem] font-semibold text-white">
              {LABEL_TEXT[photo.label] || 'Photo'}
            </span>
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-navy-950/95 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged photo"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[0.875rem] font-semibold text-white">
              {LABEL_TEXT[current.label] || 'Photo'} · {index + 1}/{count}
            </p>
            <button
              type="button"
              className="min-h-11 rounded-xl bg-white px-4 text-[0.875rem] font-semibold text-navy-900"
              onClick={() => setLightbox(false)}
            >
              Close
            </button>
          </div>
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={current.url}
              alt={current.alt || LABEL_TEXT[current.label] || 'Job photo'}
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />
            {count > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-1 min-h-11 min-w-11 rounded-full bg-white text-navy-900 sm:left-4"
                  onClick={() => go(index - 1)}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-1 min-h-11 min-w-11 rounded-full bg-white text-navy-900 sm:right-4"
                  onClick={() => go(index + 1)}
                  aria-label="Next photo"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
