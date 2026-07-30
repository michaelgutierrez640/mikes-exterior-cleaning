/**
 * Curated photo library — every image manually reviewed and placed by service.
 * Categories reflect actual service shown, not on-disk folder names.
 */

import { OUR_WORK_IMAGE_LIBRARY } from '../../lib/ourWorkImageLibrary.mjs'

export { OUR_WORK_IMAGE_LIBRARY }

function img(path) {
  const base = path.replace(/\.jpg$/, '')
  return {
    src: path,
    webp: `${base}.webp`,
    srcSet: null,
  }
}

export const HERO_IMAGE = {
  ...img('/images/gallery/solar-panel-cleaning/solar-panel-cleaning-01.jpg'),
  srcSet:
    '/images/gallery/solar-panel-cleaning/solar-panel-cleaning-01-480w.webp 480w, /images/gallery/solar-panel-cleaning/solar-panel-cleaning-01-800w.webp 800w, /images/gallery/solar-panel-cleaning/solar-panel-cleaning-01-1200w.webp 1200w',
  alt: 'Mike cleaning solar panels on a residential roof in Modesto, CA',
  objectPosition: 'center 40%',
}

export const ABOUT_IMAGE = {
  ...img('/images/owner/mike.jpg'),
  srcSet: '/images/owner/mike-200w.webp 200w, /images/owner/mike-400w.webp 400w',
  alt: 'Mike professionally cleaning windows at a luxury home in the Central Valley',
  objectPosition: 'center 35%',
}

export const LOGO_IMAGE = {
  ...img('/images/gallery/luxury-homes/luxury-homes-01.jpg'),
  srcSet:
    '/images/gallery/luxury-homes/luxury-homes-01-480w.webp 480w, /images/gallery/luxury-homes/luxury-homes-01-800w.webp 800w',
  alt: "Mike's Exterior Cleaning Services",
}

export const SERVICE_IMAGES = {
  'window-cleaning': {
    ...img('/images/gallery/window-cleaning/window-cleaning-11.jpg'),
    srcSet:
      '/images/gallery/window-cleaning/window-cleaning-11-480w.webp 480w, /images/gallery/window-cleaning/window-cleaning-11-800w.webp 800w, /images/gallery/window-cleaning/window-cleaning-11-1200w.webp 1200w',
    alt: 'Professional window cleaner standing in a bathtub cleaning a large interior bay window',
    objectPosition: 'center 35%',
  },
  'pressure-washing': {
    ...img('/images/gallery/commercial/commercial-02.jpg'),
    srcSet:
      '/images/gallery/commercial/commercial-02-480w.webp 480w, /images/gallery/commercial/commercial-02-800w.webp 800w, /images/gallery/commercial/commercial-02-1200w.webp 1200w',
    alt: 'Professional driveway pressure washing with branded equipment',
    objectPosition: 'center 45%',
  },
  'roof-cleaning': {
    ...img('/images/gallery/roof-cleaning/roof-cleaning-12.jpg'),
    srcSet:
      '/images/gallery/roof-cleaning/roof-cleaning-12-480w.webp 480w, /images/gallery/roof-cleaning/roof-cleaning-12-800w.webp 800w, /images/gallery/roof-cleaning/roof-cleaning-12-1200w.webp 1200w',
    alt: 'Roof cleaning transformation — moss removal in progress',
    objectPosition: 'center 35%',
  },
  'gutter-cleaning': {
    ...img('/images/gallery/gutter-cleaning/gutter-cleaning-01.jpg'),
    srcSet:
      '/images/gallery/gutter-cleaning/gutter-cleaning-01-480w.webp 480w, /images/gallery/gutter-cleaning/gutter-cleaning-01-800w.webp 800w, /images/gallery/gutter-cleaning/gutter-cleaning-01-1200w.webp 1200w',
    alt: 'Clogged gutter before professional gutter cleaning in Modesto',
    objectPosition: 'center center',
  },
  'residential-window-cleaning': {
    ...img('/images/gallery/window-cleaning/window-cleaning-11.jpg'),
    srcSet:
      '/images/gallery/window-cleaning/window-cleaning-11-480w.webp 480w, /images/gallery/window-cleaning/window-cleaning-11-800w.webp 800w, /images/gallery/window-cleaning/window-cleaning-11-1200w.webp 1200w',
    alt: 'Professional window cleaner standing in a bathtub cleaning a large interior bay window',
    objectPosition: 'center 35%',
  },
  'solar-panel-cleaning': {
    ...img('/images/gallery/solar-panel-cleaning/solar-panel-cleaning-01.jpg'),
    srcSet:
      '/images/gallery/solar-panel-cleaning/solar-panel-cleaning-01-480w.webp 480w, /images/gallery/solar-panel-cleaning/solar-panel-cleaning-01-800w.webp 800w, /images/gallery/solar-panel-cleaning/solar-panel-cleaning-01-1200w.webp 1200w',
    alt: 'Professional solar panel cleaning in Modesto',
    objectPosition: 'center 40%',
  },
}

/** Verified same-project pairs only — same surface, same camera angle. */
export const BEFORE_AFTER_SETS = [
  {
    id: 'img-0947',
    label: 'Window Cleaning — Modesto',
    before: '/images/before-after/img-0947-before.jpg',
    after: '/images/before-after/img-0947-after.jpg',
    beforeWebp: '/images/before-after/img-0947-before.webp',
    afterWebp: '/images/before-after/img-0947-after.webp',
    beforeSrcSet:
      '/images/before-after/img-0947-before-800w.webp 800w, /images/before-after/img-0947-before-1200w.webp 1200w, /images/before-after/img-0947-before-1600w.webp 1600w',
    afterSrcSet:
      '/images/before-after/img-0947-after-800w.webp 800w, /images/before-after/img-0947-after-1200w.webp 1200w, /images/before-after/img-0947-after-1600w.webp 1600w',
  },
  {
    id: 'driveway-pressure',
    label: 'Pressure Washing — Driveway',
    before: '/images/gallery/pressure-washing/pressure-washing-01.jpg',
    after: '/images/gallery/pressure-washing/pressure-washing-02.jpg',
    beforeWebp: '/images/gallery/pressure-washing/pressure-washing-01.webp',
    afterWebp: '/images/gallery/pressure-washing/pressure-washing-02.webp',
    beforeSrcSet:
      '/images/gallery/pressure-washing/pressure-washing-01-480w.webp 480w, /images/gallery/pressure-washing/pressure-washing-01-800w.webp 800w, /images/gallery/pressure-washing/pressure-washing-01-1200w.webp 1200w',
    afterSrcSet:
      '/images/gallery/pressure-washing/pressure-washing-02-480w.webp 480w, /images/gallery/pressure-washing/pressure-washing-02-800w.webp 800w, /images/gallery/pressure-washing/pressure-washing-02-1200w.webp 1200w',
  },
  {
    id: 'roof-tile',
    label: 'Roof Cleaning — Tile Roof',
    aspectClass: 'aspect-[3/4]',
    before: '/images/before-after/roof-tile-before.jpg',
    after: '/images/before-after/roof-tile-after.jpg',
    beforeWebp: '/images/before-after/roof-tile-before.webp',
    afterWebp: '/images/before-after/roof-tile-after.webp',
    beforeSrcSet:
      '/images/before-after/roof-tile-before-800w.webp 800w, /images/before-after/roof-tile-before-1200w.webp 1200w, /images/before-after/roof-tile-before-1600w.webp 1600w',
    afterSrcSet:
      '/images/before-after/roof-tile-after-800w.webp 800w, /images/before-after/roof-tile-after-1200w.webp 1200w, /images/before-after/roof-tile-after-1600w.webp 1600w',
  },
  {
    id: 'walkway-pressure',
    label: 'Pressure Washing — Walkway',
    aspectClass: 'aspect-[3/4]',
    before: '/images/before-after/walkway-before.jpg',
    after: '/images/before-after/walkway-after.jpg',
    beforeWebp: '/images/before-after/walkway-before.webp',
    afterWebp: '/images/before-after/walkway-after.webp',
    beforeSrcSet:
      '/images/before-after/walkway-before-800w.webp 800w, /images/before-after/walkway-before-1200w.webp 1200w, /images/before-after/walkway-before-1600w.webp 1600w',
    afterSrcSet:
      '/images/before-after/walkway-after-800w.webp 800w, /images/before-after/walkway-after-1200w.webp 1200w, /images/before-after/walkway-after-1600w.webp 1600w',
  },
]

const CATEGORY_TITLES = {
  transformations: 'Transformations',
  'window-cleaning': 'Window Cleaning',
  'solar-panel-cleaning': 'Solar Panel Cleaning',
  'pressure-washing': 'Pressure Washing',
  'roof-cleaning': 'Roof Cleaning',
  'gutter-cleaning': 'Gutter Cleaning',
  'luxury-homes': 'Luxury Homes',
}

export const GALLERY_CATEGORY_ORDER = [
  'window-cleaning',
  'solar-panel-cleaning',
  'pressure-washing',
  'roof-cleaning',
  'gutter-cleaning',
  'luxury-homes',
]

function makeImageItem({ src, alt, width = 4032, height = 3024 }) {
  return {
    type: 'image',
    src,
    webp: src.replace('.jpg', '.webp'),
    alt,
    width,
    height,
  }
}

/** @deprecated use OUR_WORK_IMAGE_LIBRARY */
const IMAGE_LIBRARY = OUR_WORK_IMAGE_LIBRARY

function findGalleryItem(gallery, src) {
  for (const cat of Object.values(gallery)) {
    const item = cat.items?.find((i) => i.src === src && i.type === 'image')
    if (item) return item
  }
  return null
}

function resolveEntry(gallery, entry) {
  const item = findGalleryItem(gallery, entry.src)
  const base = item ? { ...item, alt: entry.alt } : makeImageItem({ src: entry.src, alt: entry.alt })
  if (entry.pairLabel) {
    base.pairLabel = entry.pairLabel
    base.pairId = entry.pairId
  }
  return base
}

function normalizeHiddenSrcs(hiddenSrcs) {
  if (!hiddenSrcs) return new Set()
  if (hiddenSrcs instanceof Set) return hiddenSrcs
  return new Set([...(hiddenSrcs || [])].map((s) => String(s || '').trim()).filter(Boolean))
}

/** "All" gallery — every library image once, priority order. */
export function getCuratedGalleryItems(gallery, { hiddenSrcs } = {}) {
  const hidden = normalizeHiddenSrcs(hiddenSrcs)
  const picked = []
  const usedSrc = new Set()

  for (const entry of OUR_WORK_IMAGE_LIBRARY) {
    if (hidden.has(entry.src)) continue
    if (usedSrc.has(entry.src)) continue
    usedSrc.add(entry.src)
    const primary = entry.categories[0]
    picked.push({
      ...resolveEntry(gallery, entry),
      category: primary,
      categoryTitle: CATEGORY_TITLES[primary] || primary,
    })
  }

  return picked
}

/** Per-tab gallery — images appear in every category they belong to. */
export function getCuratedGalleryByCategory(gallery, { hiddenSrcs } = {}) {
  const hidden = normalizeHiddenSrcs(hiddenSrcs)
  const byCat = {}

  for (const entry of OUR_WORK_IMAGE_LIBRARY) {
    if (hidden.has(entry.src)) continue
    const item = resolveEntry(gallery, entry)
    for (const cat of entry.categories) {
      if (!byCat[cat]) byCat[cat] = []
      byCat[cat].push({
        ...item,
        category: cat,
        categoryTitle: CATEGORY_TITLES[cat] || cat,
      })
    }
  }

  return byCat
}
