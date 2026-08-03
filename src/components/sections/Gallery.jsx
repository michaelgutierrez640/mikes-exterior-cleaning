import { useState, useMemo, useCallback, useEffect } from 'react'
import { IMAGES, getCuratedGalleryItems, getCuratedGalleryByCategory } from '../../config/images'
import { CATEGORY_TITLES, GALLERY_CATEGORY_ORDER } from '../../config/imagePlacement'
import Lightbox from '../ui/Lightbox'
import ScrollReveal from '../ScrollReveal'
import GalleryImage from '../gallery/GalleryImage'

async function fetchOurWorkGalleryData() {
  try {
    const res = await fetch('/api/projects?resource=our-work-gallery', {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return { hiddenSrcs: [], jobPhotos: [] }
    const data = await res.json()
    return {
      hiddenSrcs: Array.isArray(data.hiddenSrcs) ? data.hiddenSrcs : [],
      jobPhotos: Array.isArray(data.jobPhotos) ? data.jobPhotos : [],
    }
  } catch {
    return { hiddenSrcs: [], jobPhotos: [] }
  }
}

export default function Gallery() {
  const [active, setActive] = useState('all')
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [hiddenSrcs, setHiddenSrcs] = useState([])
  const [jobPhotos, setJobPhotos] = useState([])

  useEffect(() => {
    let cancelled = false
    fetchOurWorkGalleryData().then((data) => {
      if (!cancelled) {
        setHiddenSrcs(data.hiddenSrcs)
        setJobPhotos(data.jobPhotos)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const allItems = useMemo(
    () => getCuratedGalleryItems(IMAGES.gallery, { hiddenSrcs, jobPhotos }),
    [hiddenSrcs, jobPhotos],
  )

  const curatedByCategory = useMemo(
    () => getCuratedGalleryByCategory(IMAGES.gallery, { hiddenSrcs, jobPhotos }),
    [hiddenSrcs, jobPhotos],
  )

  const categoryEntries = useMemo(() => {
    const keys = [
      ...GALLERY_CATEGORY_ORDER.filter((key) => (curatedByCategory[key] || []).length > 0),
      ...Object.keys(curatedByCategory).filter(
        (key) => !GALLERY_CATEGORY_ORDER.includes(key) && (curatedByCategory[key] || []).length > 0,
      ),
    ]
    return keys.map((key) => [key, curatedByCategory[key]])
  }, [curatedByCategory])

  const currentItems = active === 'all' ? allItems : curatedByCategory[active] || []

  const imageItems = useMemo(
    () => currentItems.filter((i) => i.type === 'image'),
    [currentItems],
  )

  const openLightbox = useCallback(
    (item) => {
      const idx = imageItems.findIndex((i) => i.src === item.src)
      if (idx >= 0) setLightboxIndex(idx)
    },
    [imageItems],
  )

  const navigateLightbox = useCallback(
    (dir) => {
      setLightboxIndex((prev) => {
        if (prev === null) return null
        return (prev + dir + imageItems.length) % imageItems.length
      })
    },
    [imageItems.length],
  )

  const hasPhotos = allItems.length > 0

  return (
    <section id="gallery" className="section-padding relative bg-section-gallery" aria-labelledby="gallery-heading">
      <div className="section-container relative">
        <ScrollReveal className="section-header" animation="reveal-fade">
          <p className="section-label">Our Work</p>
          <h2 id="gallery-heading" className="section-title">
            Project Gallery
          </h2>
          <p className="section-subtitle">
            Portfolio photos, videos, and published jobs from window cleaning, solar panel cleaning, pressure
            washing, gutter cleaning, and more across the Central Valley. Filter by service — project media links
            to the full job page.
          </p>
        </ScrollReveal>

        {hasPhotos && (
          <ScrollReveal className="section-content" delay="delay-100">
            <div
              className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:gap-2.5 [&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label="Gallery service filters"
            >
              <button
                type="button"
                role="tab"
                aria-selected={active === 'all'}
                onClick={() => setActive('all')}
                className={`shrink-0 rounded-full px-5 py-2.5 text-[0.8125rem] font-semibold tracking-[-0.01em] transition-all duration-300 sm:min-h-[44px] ${
                  active === 'all'
                    ? 'bg-navy-900 text-white shadow-[0_2px_12px_rgba(10,22,40,0.2)]'
                    : 'border border-gray-200/80 bg-white text-gray-600 hover:border-gray-300 hover:text-navy-900'
                }`}
              >
                All
              </button>
              {categoryEntries.map(([key]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active === key}
                  onClick={() => setActive(key)}
                  className={`shrink-0 rounded-full px-5 py-2.5 text-[0.8125rem] font-semibold tracking-[-0.01em] transition-all duration-300 sm:min-h-[44px] ${
                    active === key
                      ? 'bg-navy-900 text-white shadow-[0_2px_12px_rgba(10,22,40,0.2)]'
                      : 'border border-gray-200/80 bg-white text-gray-600 hover:border-gray-300 hover:text-navy-900'
                  }`}
                >
                  {CATEGORY_TITLES[key] || IMAGES.gallery[key]?.title || key}
                </button>
              ))}
            </div>
          </ScrollReveal>
        )}

        {hasPhotos ? (
          <div key={active} className="gallery-fade-in mt-10 columns-1 gap-5 sm:mt-12 sm:columns-2 lg:columns-3">
            {currentItems.map((item, i) => (
              <ScrollReveal key={`${item.src}-${i}`} stagger={i + 1}>
                <GalleryImage item={item} onOpen={openLightbox} />
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <ScrollReveal className="mt-10 sm:mt-12">
            <p className="mx-auto max-w-lg rounded-2xl border border-royal-100 bg-white px-6 py-8 text-center text-[0.9375rem] leading-relaxed text-gray-600">
              Project photos will appear here once organized.
            </p>
          </ScrollReveal>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={imageItems}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={navigateLightbox}
        />
      )}
    </section>
  )
}
