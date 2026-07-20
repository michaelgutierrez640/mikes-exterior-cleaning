import { useCallback, useEffect, useMemo, useState } from 'react'
import { IMAGES, getCuratedGalleryItems } from '../../config/images'
import { fetchPublicGalleryItems } from '../../services/projectsApi'
import {
  OUR_WORK_FILTERS,
  filterOurWorkItems,
  mergeOurWorkGallery,
} from '../../utils/ourWorkGallery'
import Lightbox from '../ui/Lightbox'
import ScrollReveal from '../ScrollReveal'
import OurWorkGalleryImage from '../gallery/OurWorkGalleryImage'

/** First row on lg (3-col) / sm (2-col) / mobile (1-col). */
const PRIORITY_COUNT = 3

export default function Gallery() {
  const [active, setActive] = useState('all')
  const [projectItems, setProjectItems] = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const legacyItems = useMemo(() => getCuratedGalleryItems(IMAGES.gallery), [])

  useEffect(() => {
    let cancelled = false
    setLoadState('loading')
    ;(async () => {
      try {
        const items = await fetchPublicGalleryItems()
        if (cancelled) return
        setProjectItems(Array.isArray(items) ? items : [])
        setLoadState('ready')
      } catch {
        if (cancelled) return
        // Fail open to legacy-only so the section still works if API is down.
        setProjectItems([])
        setLoadState('ready')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const allItems = useMemo(
    () => mergeOurWorkGallery(projectItems, legacyItems),
    [projectItems, legacyItems],
  )

  const currentItems = useMemo(
    () => filterOurWorkItems(allItems, active),
    [allItems, active],
  )

  const legacyLightboxItems = useMemo(
    () =>
      currentItems
        .filter((i) => i.kind === 'legacy')
        .map((i) => ({
          type: 'image',
          src: i.src || i.url,
          webp: i.webp,
          srcSet: i.srcSet,
          alt: i.alt,
        })),
    [currentItems],
  )

  const openLegacyLightbox = useCallback(
    (item) => {
      const src = item.src || item.url
      const idx = legacyLightboxItems.findIndex((i) => i.src === src)
      if (idx >= 0) setLightboxIndex(idx)
    },
    [legacyLightboxItems],
  )

  const navigateLightbox = useCallback(
    (dir) => {
      setLightboxIndex((prev) => {
        if (prev === null) return null
        return (prev + dir + legacyLightboxItems.length) % legacyLightboxItems.length
      })
    },
    [legacyLightboxItems.length],
  )

  const hasPhotos = currentItems.length > 0 || loadState === 'loading'

  return (
    <section id="gallery" className="section-padding relative bg-section-gallery" aria-labelledby="gallery-heading">
      <div className="section-container relative">
        <ScrollReveal className="section-header" animation="reveal-fade">
          <p className="section-label">Our Work</p>
          <h2 id="gallery-heading" className="section-title">
            Project Gallery
          </h2>
          <p className="section-subtitle">
            Real completed jobs from across the Central Valley — click any photo to see the full project.
          </p>
        </ScrollReveal>

        <ScrollReveal className="section-content" delay="delay-100">
          <div
            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:gap-2.5 [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Gallery categories"
          >
            {OUR_WORK_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={active === filter.id}
                onClick={() => setActive(filter.id)}
                className={`shrink-0 rounded-full px-5 py-2.5 text-[0.8125rem] font-semibold tracking-[-0.01em] transition-all duration-300 sm:min-h-[44px] ${
                  active === filter.id
                    ? 'bg-navy-900 text-white shadow-[0_2px_12px_rgba(10,22,40,0.2)]'
                    : 'border border-gray-200/80 bg-white text-gray-600 hover:border-gray-300 hover:text-navy-900'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {loadState === 'loading' && allItems.length === 0 ? (
          <div className="mt-10 columns-1 gap-5 sm:mt-12 sm:columns-2 lg:columns-3" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="mb-5 break-inside-avoid animate-pulse rounded-[1rem] bg-gradient-to-br from-navy-100 via-gray-100 to-navy-50 aspect-[4/3]"
              />
            ))}
          </div>
        ) : hasPhotos && currentItems.length > 0 ? (
          <div key={active} className="gallery-fade-in mt-10 columns-1 gap-5 sm:mt-12 sm:columns-2 lg:columns-3">
            {currentItems.map((item, i) => (
              <ScrollReveal key={item.id} stagger={Math.min(i + 1, 8)}>
                <OurWorkGalleryImage
                  item={item}
                  priority={i < PRIORITY_COUNT}
                  onOpenLegacy={openLegacyLightbox}
                />
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <ScrollReveal className="mt-10 sm:mt-12">
            <p className="mx-auto max-w-lg rounded-2xl border border-royal-100 bg-white px-6 py-8 text-center text-[0.9375rem] leading-relaxed text-gray-600">
              {active === 'all'
                ? 'Published project photos will appear here automatically.'
                : `No published ${OUR_WORK_FILTERS.find((f) => f.id === active)?.label || ''} photos yet.`}
            </p>
          </ScrollReveal>
        )}
      </div>

      {lightboxIndex !== null && legacyLightboxItems.length > 0 && (
        <Lightbox
          items={legacyLightboxItems}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={navigateLightbox}
        />
      )}
    </section>
  )
}
