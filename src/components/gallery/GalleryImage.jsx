import { useEffect, useState } from 'react'
import ResponsiveImage from '../ui/ResponsiveImage'

function GalleryImage({ item, onOpen }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setFailed(false)

    if (item.type === 'video') {
      fetch(item.src, { method: 'HEAD' })
        .then((res) => { if (res.ok) setLoaded(true); else setFailed(true) })
        .catch(() => setFailed(true))
      return
    }

    const img = new Image()
    img.onload = () => setLoaded(true)
    img.onerror = () => setFailed(true)
    img.src = item.webp || item.src
  }, [item.src, item.webp, item.type])

  if (item.type === 'video') {
    if (!loaded || failed) {
      return null
    }

    return (
      <figure className="mb-5 break-inside-avoid overflow-hidden rounded-[1rem]">
        <video src={item.src} poster={item.poster} controls playsInline preload="metadata" className="w-full" aria-label={item.alt} />
      </figure>
    )
  }

  if (failed) return null

  return (
    <figure className="group relative mb-5 break-inside-avoid overflow-hidden rounded-[1rem] bg-gray-100 transition-[box-shadow] duration-500 hover:shadow-[0_12px_40px_rgba(10,22,40,0.1)]">
      {!loaded && (
        <div className="aspect-[4/3] img-shimmer" aria-hidden="true" role="presentation" />
      )}
      {loaded && (
        <>
          <ResponsiveImage
            src={item.src}
            webp={item.webp}
            srcSet={item.srcSet}
            alt={item.alt}
            loading="lazy"
            decoding="async"
            onClick={() => onOpen(item)}
            className="img-loaded w-full cursor-pointer object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
          />
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-navy-900 opacity-0 shadow-[0_2px_12px_rgba(0,0,0,0.12)] transition-all duration-300 group-hover:opacity-100 active:scale-95"
            aria-label={`View ${item.alt}`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
            </svg>
          </button>
        </>
      )}
    </figure>
  )
}

export default GalleryImage
