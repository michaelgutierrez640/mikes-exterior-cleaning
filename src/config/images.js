import manifest from './images.manifest.json'
import {
  HERO_IMAGE,
  ABOUT_IMAGE,
  LOGO_IMAGE,
  SERVICE_IMAGES,
  BEFORE_AFTER_SETS,
  getCuratedGalleryItems,
  getCuratedGalleryByCategory,
} from './imagePlacement'

const base = (path) => `/images/${path}`

const PLACEHOLDER_GALLERY = Object.fromEntries(
  [
    ['window-cleaning', 'Window Cleaning'],
    ['solar-panel-cleaning', 'Solar Panel Cleaning'],
    ['pressure-washing', 'Pressure Washing'],
    ['roof-cleaning', 'Roof Cleaning'],
    ['commercial', 'Commercial'],
    ['luxury-homes', 'Luxury Homes'],
    ['truck-branding', 'Truck & Branding'],
    ['gutter-cleaning', 'Gutter Cleaning'],
  ].map(([slug, title]) => [
    slug,
    {
      title,
      seo: `${title} Modesto`,
      items: [],
    },
  ]),
)

const DEFAULT_IMAGES = {
  hero: {
    src: base('hero/hero-bg.jpg'),
    alt: 'Professional exterior cleaning for homes in Modesto and the Central Valley',
    placeholderLabel: 'Hero photo needed',
    placeholderFile: 'public/images/_incoming/',
    sizeHint: 'Horizontal photo, 2000px wide',
  },
  owner: {
    src: base('owner/mike.jpg'),
    alt: "Mike — owner of Mike's Exterior Cleaning Services",
    placeholderLabel: 'Owner photo needed',
    placeholderFile: 'public/images/_incoming/',
    sizeHint: 'Square headshot, 800×800px',
  },
  beforeAfter: [],
  gallery: PLACEHOLDER_GALLERY,
}

function normalizeGalleryItem(item, slug, index) {
  return {
    ...item,
    file: item.file || `public/images/gallery/${slug}/`,
    title: item.title || `${PLACEHOLDER_GALLERY[slug]?.title || slug} project photo`,
    sizeHint: item.sizeHint || 'Landscape, 1200px wide',
    alt: item.alt || `${PLACEHOLDER_GALLERY[slug]?.title || slug} project photo ${index + 1}`,
  }
}

function fromManifest(data) {
  const gallery = { ...PLACEHOLDER_GALLERY }
  for (const [slug, cat] of Object.entries(data.gallery || {})) {
    gallery[slug] = {
      title: cat.title,
      seo: cat.seo,
      items: (cat.items || []).map((item, i) => normalizeGalleryItem(item, slug, i)),
    }
  }

  return {
    hero: data.hero
      ? {
          src: data.hero.src,
          webp: data.hero.webp,
          srcSet: data.hero.srcSet,
          alt: data.hero.alt,
        }
      : DEFAULT_IMAGES.hero,
    owner: data.owner
      ? {
          src: data.owner.src,
          webp: data.owner.webp,
          srcSet: data.owner.srcSet,
          alt: data.owner.alt,
        }
      : DEFAULT_IMAGES.owner,
    beforeAfter: (data.beforeAfter || []).map((item) => ({
      id: item.id,
      label: item.label,
      before: item.before,
      after: item.after,
      beforeWebp: item.beforeWebp,
      afterWebp: item.afterWebp,
      beforeSrcSet: item.beforeSrcSet,
      afterSrcSet: item.afterSrcSet,
    })),
    gallery,
    generated: data.generated,
    imageCount: data.imageCount,
  }
}

export const IMAGES = manifest.generated ? fromManifest(manifest) : DEFAULT_IMAGES

export function getHeroImage() {
  return HERO_IMAGE
}

export function getAboutImage() {
  return ABOUT_IMAGE
}

export function getLogoImage() {
  return LOGO_IMAGE
}

export function getServiceImage(slug) {
  return SERVICE_IMAGES[slug] || null
}

export function getBeforeAfterSets() {
  return BEFORE_AFTER_SETS
}

export { getCuratedGalleryItems, getCuratedGalleryByCategory }

export const GALLERY_CATEGORY_ORDER = [
  'window-cleaning',
  'solar-panel-cleaning',
  'pressure-washing',
  'roof-cleaning',
  'commercial',
  'luxury-homes',
  'truck-branding',
  'gutter-cleaning',
]

export function getAllGalleryItems() {
  const items = []
  for (const slug of GALLERY_CATEGORY_ORDER) {
    const cat = IMAGES.gallery[slug]
    if (!cat?.items?.length) continue
    for (const item of cat.items) {
      items.push({ ...item, category: slug, categoryTitle: cat.title })
    }
  }
  return items
}
