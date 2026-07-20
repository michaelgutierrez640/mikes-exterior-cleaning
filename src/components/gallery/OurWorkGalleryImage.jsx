import { Link } from 'react-router-dom'
import ProjectOptimizedImage from '../projects/ProjectOptimizedImage'
import ResponsiveImage from '../ui/ResponsiveImage'
import {
  cityLabel,
  formatCompletedDate,
  projectHeading,
  projectPath,
  serviceLabel,
} from '../../utils/projectLabels'
import { photoLabelText } from '../../utils/ourWorkGallery'
import { useEffect, useState } from 'react'

/**
 * Our Work gallery tile — optimized project photos link to /projects/:slug.
 * Legacy static photos keep lightbox open behavior.
 */
export default function OurWorkGalleryImage({ item, priority = false, onOpenLegacy }) {
  if (item.kind === 'project' && item.projectSlug) {
    const title = projectHeading({ service: item.service, city: item.city })
    const href = projectPath(item.projectSlug)
    const photo = {
      url: item.url,
      variants: item.variants,
      blurDataUrl: item.blurDataUrl,
      width: item.width,
      height: item.height,
      alt: item.alt,
    }
    const meta = [
      serviceLabel(item.service),
      cityLabel(item.city),
      item.completedAt ? formatCompletedDate(item.completedAt) : null,
      photoLabelText(item.label),
    ]
      .filter(Boolean)
      .join(' · ')

    return (
      <figure className="group relative mb-5 break-inside-avoid overflow-hidden rounded-[1rem] bg-navy-950/[0.06] shadow-[0_1px_3px_rgba(10,22,40,0.06)] transition-[box-shadow] duration-500 hover:shadow-[0_12px_40px_rgba(10,22,40,0.1)]">
        <Link to={href} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500" aria-label={`${title} — ${photoLabelText(item.label)}`}>
          <ProjectOptimizedImage
            photo={photo}
            role="card"
            alt={item.alt || title}
            className="aspect-[4/3] w-full"
            imgClassName="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            aspectRatio="4 / 3"
            priority={priority}
          />
          <figcaption className="absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-navy-950/90 via-navy-950/55 to-transparent px-3.5 pt-10 pb-3.5 text-white">
            <p className="font-display text-[0.9375rem] font-semibold leading-snug">{title}</p>
            <p className="mt-1 text-[0.75rem] leading-snug text-white/75">{meta}</p>
          </figcaption>
        </Link>
      </figure>
    )
  }

  return <LegacyOurWorkImage item={item} priority={priority} onOpen={onOpenLegacy} />
}

function LegacyOurWorkImage({ item, priority, onOpen }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const src = item.src || item.url

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
    const img = new Image()
    img.onload = () => setLoaded(true)
    img.onerror = () => setFailed(true)
    img.src = item.webp || src
  }, [src, item.webp])

  if (failed) return null

  const caption = [item.categoryTitle, photoLabelText(item.label)].filter(Boolean).join(' · ')

  return (
    <figure className="group relative mb-5 break-inside-avoid overflow-hidden rounded-[1rem] bg-navy-950/[0.06] transition-[box-shadow] duration-500 hover:shadow-[0_12px_40px_rgba(10,22,40,0.1)]">
      {!loaded && (
        <div className="aspect-[4/3] animate-pulse bg-gradient-to-br from-navy-100 via-gray-100 to-navy-50" aria-hidden="true" />
      )}
      {loaded && (
        <>
          <button
            type="button"
            className="block w-full text-left"
            onClick={() => onOpen?.(item)}
            aria-label={item.alt || 'View photo'}
          >
            <div className="aspect-[4/3] overflow-hidden">
              <ResponsiveImage
                src={src}
                webp={item.webp}
                srcSet={item.srcSet}
                alt={item.alt || ''}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={priority ? 'high' : 'auto'}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            {(item.categoryTitle || item.alt) && (
              <figcaption className="absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-navy-950/85 via-navy-950/45 to-transparent px-3.5 pt-10 pb-3.5 text-white">
                <p className="text-[0.8125rem] font-semibold leading-snug">{item.alt || item.categoryTitle}</p>
                {caption ? <p className="mt-1 text-[0.75rem] text-white/70">{caption}</p> : null}
              </figcaption>
            )}
          </button>
        </>
      )}
    </figure>
  )
}
