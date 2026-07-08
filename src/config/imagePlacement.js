/**
 * Curated photo library — every image manually reviewed and placed by service.
 * Categories reflect actual service shown, not on-disk folder names.
 */

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
    ...img('/images/before-after/img-0947-after.jpg'),
    srcSet:
      '/images/before-after/img-0947-after-800w.webp 800w, /images/before-after/img-0947-after-1200w.webp 1200w, /images/before-after/img-0947-after-1600w.webp 1600w',
    alt: 'Crystal-clear sliding glass door after professional window cleaning',
    objectPosition: 'center center',
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
    ...img('/images/gallery/window-cleaning/window-cleaning-01.jpg'),
    srcSet:
      '/images/gallery/window-cleaning/window-cleaning-01-480w.webp 480w, /images/gallery/window-cleaning/window-cleaning-01-800w.webp 800w, /images/gallery/window-cleaning/window-cleaning-01-1200w.webp 1200w',
    alt: 'Residential window cleaning at a home in Modesto',
    objectPosition: 'center center',
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

/**
 * Master library — order = display priority in "All" gallery.
 * `categories` lists every tab where the image belongs (true service + optional transformations).
 */
const IMAGE_LIBRARY = [
  // ── Featured transformations (dramatic results & in-frame before/after) ──
  {
    src: '/images/gallery/window-cleaning/window-cleaning-06.jpg',
    categories: ['transformations', 'window-cleaning'],
    alt: 'Window cleaning transformation — dirty vs crystal-clear glass',
  },
  {
    src: '/images/gallery/roof-cleaning/roof-cleaning-05.jpg',
    categories: ['transformations', 'roof-cleaning'],
    alt: 'Roof cleaning transformation — moss removal from tile roof',
  },
  {
    src: '/images/gallery/roof-cleaning/roof-cleaning-12.jpg',
    categories: ['transformations', 'roof-cleaning'],
    alt: 'Roof cleaning in progress — clean vs mossy shingles',
  },
  {
    src: '/images/before-after/img-5766-before.jpg',
    categories: ['transformations', 'roof-cleaning'],
    alt: 'Moss-covered tile roof before professional cleaning',
  },
  {
    src: '/images/gallery/window-cleaning/window-cleaning-05.jpg',
    categories: ['transformations', 'window-cleaning'],
    alt: 'Luxury home windows — dirty vs professionally cleaned glass',
  },

  // ── Window cleaning ──
  {
    src: '/images/before-after/img-0947-before.jpg',
    categories: ['window-cleaning'],
    alt: 'Window cleaning before — dirty sliding glass door',
  },
  {
    src: '/images/before-after/img-0947-after.jpg',
    categories: ['window-cleaning'],
    alt: 'Window cleaning after — crystal-clear sliding glass door',
  },
  {
    src: '/images/gallery/window-cleaning/window-cleaning-01.jpg',
    categories: ['window-cleaning', 'luxury-homes'],
    alt: 'Window cleaning at a luxury estate in Modesto',
  },
  {
    src: '/images/gallery/window-cleaning/window-cleaning-03.jpg',
    categories: ['window-cleaning'],
    alt: 'Professional interior window cleaning in a home gym',
  },
  {
    src: '/images/gallery/window-cleaning/window-cleaning-09.jpg',
    categories: ['window-cleaning'],
    alt: 'High-rise window cleaning with valley views',
  },
  {
    src: '/images/gallery/gutter-cleaning/gutter-cleaning-03.jpg',
    categories: ['window-cleaning'],
    alt: 'Exterior window cleaning at a luxury stone entryway',
  },
  {
    src: '/images/gallery/gutter-cleaning/gutter-cleaning-05.jpg',
    categories: ['window-cleaning'],
    alt: 'Interior sliding glass door cleaning with professional tools',
  },
  {
    src: '/images/gallery/roof-cleaning/roof-cleaning-03.jpg',
    categories: ['window-cleaning'],
    alt: 'Streak-free windows on a residential home',
  },
  {
    src: '/images/gallery/pressure-washing/pressure-washing-06.jpg',
    categories: ['window-cleaning'],
    alt: 'Professional window screen cleaning with Xero equipment',
  },
  {
    src: '/images/gallery/pressure-washing/pressure-washing-07.jpg',
    categories: ['window-cleaning'],
    alt: 'Exterior window and patio glass cleaning at a luxury home',
  },
  {
    src: '/images/gallery/solar-panel-cleaning/solar-panel-cleaning-09.jpg',
    categories: ['window-cleaning'],
    alt: 'Interior bedroom window cleaning with professional tools',
  },

  // ── Solar panel cleaning ──
  {
    src: '/images/gallery/solar-panel-cleaning/solar-panel-cleaning-01.jpg',
    categories: ['solar-panel-cleaning'],
    alt: 'Mike cleaning solar panels on a residential roof',
  },
  {
    src: '/images/gallery/solar-panel-cleaning/solar-panel-cleaning-02.jpg',
    categories: ['solar-panel-cleaning'],
    alt: 'Solar panel cleaning in progress with professional brush equipment',
  },
  {
    src: '/images/gallery/solar-panel-cleaning/solar-panel-cleaning-04.jpg',
    categories: ['solar-panel-cleaning'],
    alt: 'Clean solar panels with bird-proofing on a tile roof',
  },
  {
    src: '/images/gallery/solar-panel-cleaning/solar-panel-cleaning-08.jpg',
    categories: ['solar-panel-cleaning', 'luxury-homes'],
    alt: 'Solar panel cleaning at a luxury neighborhood home',
  },
  {
    src: '/images/gallery/luxury-homes/luxury-homes-02.jpg',
    categories: ['solar-panel-cleaning'],
    alt: 'Spotless solar panel array after professional cleaning',
  },
  {
    src: '/images/gallery/window-cleaning/window-cleaning-07.jpg',
    categories: ['solar-panel-cleaning'],
    alt: 'Solar panel cleaning from the roof with water-fed pole',
  },
  {
    src: '/images/gallery/solar-panel-cleaning/solar-panel-cleaning-03.jpg',
    categories: ['solar-panel-cleaning'],
    alt: 'Solar panels on a residential home with pool',
  },

  // ── Pressure washing ──
  {
    src: '/images/gallery/pressure-washing/pressure-washing-01.jpg',
    categories: ['pressure-washing'],
    alt: 'Driveway pressure washing before — stained concrete',
  },
  {
    src: '/images/gallery/pressure-washing/pressure-washing-02.jpg',
    categories: ['pressure-washing'],
    alt: 'Driveway pressure washing after — clean concrete',
  },
  {
    src: '/images/gallery/pressure-washing/pressure-washing-04.jpg',
    categories: ['pressure-washing', 'luxury-homes'],
    alt: 'Luxury home driveway pressure washing transformation',
  },
  {
    src: '/images/gallery/commercial/commercial-01.jpg',
    categories: ['pressure-washing'],
    alt: 'Professional surface cleaner on a residential driveway',
  },
  {
    src: '/images/gallery/commercial/commercial-02.jpg',
    categories: ['pressure-washing'],
    alt: 'Branded pressure washing service on a suburban driveway',
  },
  {
    src: '/images/before-after/img-5272-before.jpg',
    categories: ['pressure-washing'],
    alt: 'House washing before — algae-stained siding',
  },

  // ── Roof cleaning ──
  {
    src: '/images/gallery/roof-cleaning/roof-cleaning-01.jpg',
    categories: ['roof-cleaning'],
    alt: 'Dirty roof tiles before professional roof cleaning',
  },
  {
    src: '/images/gallery/roof-cleaning/roof-cleaning-07.jpg',
    categories: ['roof-cleaning'],
    alt: 'Moss-covered roof before cleaning — aerial view',
  },
  {
    src: '/images/gallery/roof-cleaning/roof-cleaning-08.jpg',
    categories: ['roof-cleaning'],
    alt: 'Clean tile roof after professional roof cleaning — drone photo',
  },
  {
    src: '/images/gallery/roof-cleaning/roof-cleaning-14.jpg',
    categories: ['roof-cleaning', 'luxury-homes'],
    alt: 'Pristine tile roof after cleaning — aerial finished result',
  },

  // ── Gutter cleaning ──
  {
    src: '/images/gallery/gutter-cleaning/gutter-cleaning-01.jpg',
    categories: ['gutter-cleaning'],
    alt: 'Clogged gutter with weeds before professional gutter cleaning',
  },
  {
    src: '/images/gallery/gutter-cleaning/gutter-cleaning-02.jpg',
    categories: ['gutter-cleaning'],
    alt: 'Debris-filled gutter on a tile roof before cleaning',
  },
  {
    src: '/images/gallery/luxury-homes/luxury-homes-04.jpg',
    categories: ['gutter-cleaning'],
    alt: 'Gutter debris removal at a luxury stucco home',
  },

  // ── Luxury homes ──
  {
    src: '/images/gallery/luxury-homes/luxury-homes-03.jpg',
    categories: ['luxury-homes'],
    alt: 'Sparkling windows on a luxury home porch',
  },
]

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

function findGalleryItem(gallery, src) {
  for (const cat of Object.values(gallery)) {
    const item = cat.items?.find((i) => i.src === src && i.type === 'image')
    if (item) return item
  }
  return null
}

function resolveEntry(gallery, entry) {
  const item = findGalleryItem(gallery, entry.src)
  return item ? { ...item, alt: entry.alt } : makeImageItem({ src: entry.src, alt: entry.alt })
}

/** "All" gallery — every library image once, priority order. */
export function getCuratedGalleryItems(gallery) {
  const picked = []
  const usedSrc = new Set()

  for (const entry of IMAGE_LIBRARY) {
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
export function getCuratedGalleryByCategory(gallery) {
  const byCat = {}

  for (const entry of IMAGE_LIBRARY) {
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
