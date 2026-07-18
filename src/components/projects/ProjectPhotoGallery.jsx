import { useCallback, useEffect, useRef, useState } from 'react'

const LABEL_TEXT = {
  before: 'Before',
  after: 'After',
  general: 'General',
}

/**
 * Public mobile-first project gallery with swipe, thumbnails, and lightbox.
 */
export default function ProjectPhotoGallery({ photos = [] }) {
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

  if (!count) return null

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

  return (
    <>
      <div className="space-y-4">
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
            alt={current.alt || ''}
            className="h-full w-full object-cover"
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={index === 0 ? 'high' : 'auto'}
          />
          <span className="absolute top-3 left-3 z-[2] rounded-full bg-navy-950/75 px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide text-white uppercase">
            {LABEL_TEXT[current.label] || 'Photo'}
          </span>
          {count > 1 && (
            <>
              <button
                type="button"
                className="absolute top-1/2 left-2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy-900 shadow"
                onClick={() => go(index - 1)}
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute top-1/2 right-2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy-900 shadow"
                onClick={() => go(index + 1)}
                aria-label="Next photo"
              >
                ›
              </button>
              <p className="absolute right-3 bottom-3 z-[2] rounded-full bg-navy-950/70 px-2.5 py-1 text-[0.75rem] text-white">
                {index + 1} / {count}
              </p>
            </>
          )}
        </div>

        {count > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ordered.map((photo, i) => (
              <button
                key={`${photo.url}-${i}`}
                type="button"
                onClick={() => setIndex(i)}
                className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                  i === index ? 'ring-royal-500' : 'ring-transparent opacity-80 hover:opacity-100'
                }`}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
              >
                <img src={photo.url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-navy-950/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => setLightbox(false)}
          >
            Close
          </button>
          <img
            src={current.url}
            alt={current.alt || ''}
            className="max-h-[85vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
