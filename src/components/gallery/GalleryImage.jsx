import { useState } from 'react'
import { Link } from 'react-router-dom'
import LazyVideo from '../media/LazyVideo'
import ResponsiveImage from '../ui/ResponsiveImage'
import { cityLabel, projectPath } from '../../utils/projectLabels'
import { isVercelBlobImageUrl, optimizedImageUrl } from '../../utils/optimizedImageUrl'

function GalleryImage({ item, onOpen }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [useOriginalRemote, setUseOriginalRemote] = useState(false)
  const projectHref = item.projectSlug ? projectPath(item.projectSlug) : null
  const isRemoteJobPhoto = isVercelBlobImageUrl(item.src)
  const displaySrc =
    isRemoteJobPhoto && !useOriginalRemote ? optimizedImageUrl(item.src, 900) : item.src
  const displayWebp = isRemoteJobPhoto ? undefined : item.webp
  const displaySrcSet = isRemoteJobPhoto ? undefined : item.srcSet
  const width = item.width || 1200
  const height = item.height || 900

  if (item.type === 'video') {
    return (
      <figure className="mb-5 break-inside-avoid overflow-hidden rounded-[1rem] bg-navy-950/5 [content-visibility:auto] [contain-intrinsic-size:300px]">
        <LazyVideo
          src={item.src}
          poster={item.poster || ''}
          contentType={item.contentType || ''}
          alt={item.alt || 'Project video'}
          className="w-full"
          preload="metadata"
        />
        {projectHref ? (
          <figcaption className="px-3 py-2 text-[0.75rem]">
            <Link to={projectHref} className="font-semibold text-royal-700 hover:text-royal-800">
              View project{item.city ? ` in ${cityLabel(item.city)}` : ''} →
            </Link>
          </figcaption>
        ) : null}
      </figure>
    )
  }

  if (failed) return null

  return (
    <figure className="group relative mb-5 break-inside-avoid overflow-hidden rounded-[1rem] bg-gray-100 transition-[box-shadow] duration-500 [content-visibility:auto] [contain-intrinsic-size:300px] hover:shadow-[0_12px_40px_rgba(10,22,40,0.1)]">
      {!loaded && (
        <div
          className="img-shimmer w-full"
          style={{ aspectRatio: `${width} / ${height}` }}
          aria-hidden="true"
          role="presentation"
        />
      )}
      <ResponsiveImage
        src={displaySrc}
        webp={displayWebp}
        srcSet={displaySrcSet}
        alt={item.alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (isRemoteJobPhoto && !useOriginalRemote) {
            setLoaded(false)
            setUseOriginalRemote(true)
            return
          }
          setFailed(true)
        }}
        onClick={() => onOpen(item)}
        className={`img-loaded w-full cursor-pointer object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] ${
          loaded ? '' : 'absolute inset-0 h-full opacity-0'
        }`}
      />
      {loaded && (
        <>
          {item.pairLabel && (
            <span
              className={`pointer-events-none absolute left-3 top-3 rounded-md px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.06em] shadow-[0_2px_10px_rgba(0,0,0,0.18)] ${
                item.pairLabel === 'Before'
                  ? 'bg-navy-900/90 text-white'
                  : 'bg-white/95 text-navy-900'
              }`}
            >
              {item.pairLabel}
            </span>
          )}
          {projectHref && (
            <Link
              to={projectHref}
              className="absolute bottom-3 left-3 z-[1] inline-flex max-w-[calc(100%-4.5rem)] items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[0.6875rem] font-semibold tracking-wide text-navy-900 uppercase shadow-[0_2px_12px_rgba(0,0,0,0.14)] transition hover:bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="truncate">
                View Project
                {item.city ? ` · ${cityLabel(item.city)}` : ''}
              </span>
              <svg className="h-3 w-3 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          )}
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
