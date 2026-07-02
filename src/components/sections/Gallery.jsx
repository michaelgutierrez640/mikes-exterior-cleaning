import { useState, useMemo, useCallback } from 'react'
import { IMAGES, getCuratedGalleryItems, getCuratedGalleryByCategory } from '../../config/images'
import Lightbox from '../ui/Lightbox'
import ScrollReveal from '../ScrollReveal'
import GalleryImage from '../gallery/GalleryImage'

const curatedByCategory = getCuratedGalleryByCategory(IMAGES.gallery)
const categoryEntries = Object.entries(curatedByCategory).filter(([, items]) => items.length > 0)

export default function Gallery() {
  const [active, setActive] = useState('all')
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const allItems = useMemo(() => getCuratedGalleryItems(IMAGES.gallery), [])

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
            Real results from window cleaning, solar panel cleaning, pressure washing, roof cleaning,
            and more across the Central Valley.
          </p>
        </ScrollReveal>

        {hasPhotos && (
          <ScrollReveal className="section-content" delay="delay-100">
            <div
              className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:gap-2.5 [&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label="Gallery categories"
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
              {categoryEntries.map(([key, items]) => (
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
                  {key === 'transformations' ? 'Transformations' : IMAGES.gallery[key]?.title || key}
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
