#!/usr/bin/env node
/**
 * Organizes project photos in public/images, optimizes for web, and generates images.manifest.json
 *
 * Usage: npm run organize-images
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const IMAGES_ROOT = path.join(ROOT, 'public', 'images')
const INCOMING = path.join(IMAGES_ROOT, '_incoming')
const MANIFEST_PATH = path.join(ROOT, 'src', 'config', 'images.manifest.json')

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif'])
const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm'])

const GALLERY_CATEGORIES = {
  'window-cleaning': {
    title: 'Window Cleaning',
    seo: 'Window Cleaning Modesto',
    keywords: ['window', 'glass', 'pane', 'squeegee', 'streak'],
  },
  'solar-panel-cleaning': {
    title: 'Solar Panel Cleaning',
    seo: 'Solar Panel Cleaning Modesto',
    keywords: ['solar', 'panel', 'pv', 'photovoltaic'],
  },
  'pressure-washing': {
    title: 'Pressure Washing',
    seo: 'Pressure Washing Modesto',
    keywords: ['pressure', 'powerwash', 'power-wash', 'driveway', 'patio', 'sidewalk', 'concrete', 'walkway'],
  },
  'roof-cleaning': {
    title: 'Roof Cleaning',
    seo: 'Roof Cleaning Modesto',
    keywords: ['roof', 'shingle', 'tile', 'softwash', 'soft-wash'],
  },
  'commercial': {
    title: 'Commercial',
    seo: 'Commercial Exterior Cleaning Modesto',
    keywords: ['commercial', 'storefront', 'business', 'office', 'retail', 'warehouse'],
  },
  'luxury-homes': {
    title: 'Luxury Homes',
    seo: 'Luxury Home Cleaning Modesto',
    keywords: ['luxury', 'estate', 'mansion', 'high-end', 'custom-home'],
  },
  'truck-branding': {
    title: 'Truck & Branding',
    seo: "Mike's Exterior Cleaning Services",
    keywords: ['truck', 'van', 'vehicle', 'logo', 'branding', 'wrap', 'fleet', 'trailer', 'rig'],
  },
  'gutter-cleaning': {
    title: 'Gutter Cleaning',
    seo: 'Gutter Cleaning Modesto',
    keywords: ['gutter', 'downspout', 'fascia'],
  },
}

const SKIP_DIRS = new Set(['_incoming', '_archive', 'node_modules'])

const SKIP_FILES = new Set([
  'img_6827.jpg',
  'photo-1314_singular_display_fullpicture.heic',
])

const MAX_VIDEO_BYTES = 25 * 1024 * 1024

/**
 * Verified manual pairs (before → after). Only add pairs where both photos show
 * the EXACT SAME surface from nearly the SAME camera angle — verify visually first.
 */
const MANUAL_PAIRS = [
  ['IMG_0947.JPG', 'IMG_0948.JPG'],
]

/** Prefer these for hero (first available landscape wins) */
const HERO_PRIORITY = [
  'IMG_3992.JPG',
  'IMG_7260.JPG',
  'IMG_2655.JPG',
  'IMG_1230.JPG',
  'IMG_1888.JPG',
  'dji_fly_20250107_132716_69_1736285336167_photo_optimized.jpg',
]

/** Owner/contact headshot */
const OWNER_FILE = 'IMG_2655.JPG'

/** Per-file category overrides from visual review */
const MANUAL_CATEGORY = {
  'a363be9a-a61f-4be3-bf7f-cd1213a86493.png': 'truck-branding',
  'img_0500.jpg': 'truck-branding',
  'img_2686.jpg': 'truck-branding',
  'img_0947.jpg': 'window-cleaning',
  'img_0948.jpg': 'window-cleaning',
  'img_1230.jpg': 'solar-panel-cleaning',
  'img_1599.jpg': 'pressure-washing',
  'img_1609.jpg': 'pressure-washing',
  'img_1620.jpg': 'pressure-washing',
  'img_1766.jpg': 'roof-cleaning',
  'img_1778.jpg': 'pressure-washing',
  'img_1885.jpg': 'window-cleaning',
  'img_1888.jpg': 'window-cleaning',
  'img_1897.jpg': 'window-cleaning',
  'img_1899.jpg': 'window-cleaning',
  'img_1901.jpg': 'window-cleaning',
  'img_1911.jpg': 'window-cleaning',
  'img_2655.jpg': 'window-cleaning',
  'img_2902.jpg': 'luxury-homes',
  'img_2913.jpg': 'luxury-homes',
  'img_3128.jpg': 'window-cleaning',
  'img_3992.jpg': 'solar-panel-cleaning',
  'img_4169.jpg': 'solar-panel-cleaning',
  'img_4173.jpg': 'solar-panel-cleaning',
  'img_4239.jpg': 'solar-panel-cleaning',
  'img_4495.jpg': 'pressure-washing',
  'img_4606.jpg': 'pressure-washing',
  'img_4616.jpg': 'pressure-washing',
  'img_4733.jpg': 'pressure-washing',
  'img_4775.jpg': 'pressure-washing',
  'img_4913.jpg': 'gutter-cleaning',
  'img_4916.jpg': 'gutter-cleaning',
  'img_5224.jpg': 'pressure-washing',
  'img_5272.jpg': 'pressure-washing',
  'img_5274.jpg': 'pressure-washing',
  'img_5570.jpg': 'roof-cleaning',
  'img_5587.jpg': 'roof-cleaning',
  'img_5766.jpg': 'roof-cleaning',
  'img_5942.heic': 'gutter-cleaning',
  'img_5947.heic': 'gutter-cleaning',
  'img_6207.jpg': 'solar-panel-cleaning',
  'img_6208.jpg': 'solar-panel-cleaning',
  'img_6453.heic': 'window-cleaning',
  'img_6517.heic': 'roof-cleaning',
  'img_6548.jpg': 'solar-panel-cleaning',
  'img_6552.jpg': 'solar-panel-cleaning',
  'img_6717.heic': 'pressure-washing',
  'img_6752.heic': 'gutter-cleaning',
  'img_6814.heic': 'window-cleaning',
  'img_6815.heic': 'window-cleaning',
  'img_6825.heic': 'solar-panel-cleaning',
  'img_7260.jpg': 'pressure-washing',
  'img_8283.heic': 'pressure-washing',
  'img_8283.jpg': 'pressure-washing',
  'img_8291.heic': 'pressure-washing',
  'img_8291.jpg': 'pressure-washing',
  'img_8376.heic': 'luxury-homes',
  'img_2081.heic': 'roof-cleaning',
}

const WIDTHS = {
  hero: [960, 1280, 1920],
  gallery: [480, 800, 1200],
  beforeAfter: [800, 1200, 1600],
  owner: [200, 400],
}

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function walkFiles(dir, files = []) {
  if (!(await exists(dir))) return files

  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      await walkFiles(full, files)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext)) files.push(full)
    }
  }
  return files
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'image'
}

function parseBeforeAfter(name) {
  const lower = name.toLowerCase()
  if (/\b(before|pre|dirty|prior)\b/.test(lower)) return { phase: 'before', base: lower.replace(/\b(before|pre|dirty|prior)\b/g, '').replace(/[-_\s]+/g, ' ').trim() }
  if (/\b(after|post|clean|done)\b/.test(lower)) return { phase: 'after', base: lower.replace(/\b(after|post|clean|done)\b/g, '').replace(/[-_\s]+/g, ' ').trim() }
  if (/[-_\s]b$/.test(lower)) return { phase: 'before', base: lower.replace(/[-_\s]b$/, '') }
  if (/[-_\s]a$/.test(lower)) return { phase: 'after', base: lower.replace(/[-_\s]a$/, '') }
  return null
}

function classifyByPath(filePath) {
  const rel = path.relative(IMAGES_ROOT, filePath).toLowerCase()
  for (const [slug, meta] of Object.entries(GALLERY_CATEGORIES)) {
    if (rel.includes(slug) || rel.includes(slug.replace(/-/g, ' '))) return slug
    for (const kw of meta.keywords) {
      if (rel.includes(kw)) return slug
    }
  }
  if (rel.includes('owner') || rel.includes('headshot') || rel.includes('mike')) return 'owner'
  if (rel.includes('before-after') || rel.includes('before_after')) return 'before-after'
  return null
}

function basenameKey(name) {
  return name.toLowerCase()
}

function stemKey(name) {
  return basenameKey(name).replace(/\.(heic|heif|jpe?g|png|webp|avif)$/i, '')
}

function classifyByFilename(name) {
  const key = basenameKey(name)
  if (MANUAL_CATEGORY[key]) return MANUAL_CATEGORY[key]
  const stem = stemKey(name)
  for (const [k, v] of Object.entries(MANUAL_CATEGORY)) {
    if (stemKey(k) === stem) return v
  }
  if (key.startsWith('dji_fly_')) return 'roof-cleaning'
  const lower = name.toLowerCase()
  for (const [slug, meta] of Object.entries(GALLERY_CATEGORIES)) {
    for (const kw of meta.keywords) {
      if (lower.includes(kw)) return slug
    }
  }
  return 'luxury-homes'
}

function classifyImage(img) {
  const key = basenameKey(path.basename(img.file))
  if (MANUAL_CATEGORY[key]) return MANUAL_CATEGORY[key]
  const stem = stemKey(path.basename(img.file))
  for (const [k, v] of Object.entries(MANUAL_CATEGORY)) {
    if (stemKey(k) === stem) return v
  }
  if (img.pathCategory && img.pathCategory !== 'owner' && img.pathCategory !== 'before-after') {
    return img.pathCategory
  }
  return classifyByFilename(path.basename(img.file))
}

function findImageByBasename(images, basename) {
  const key = basenameKey(basename)
  return images.find((img) => basenameKey(path.basename(img.file)) === key)
}

async function getImageMeta(filePath) {
  const buffer = await fs.readFile(filePath)
  const image = sharp(buffer, { failOn: 'none' })
  const meta = await image.metadata()
  const stats = await image.stats()
  const meanBrightness =
    stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / Math.max(stats.channels.length, 1)

  return {
    width: meta.width || 0,
    height: meta.height || 0,
    orientation: (meta.width || 0) >= (meta.height || 0) ? 'landscape' : 'portrait',
    meanBrightness,
    buffer,
  }
}

async function fingerprint(filePath) {
  const { buffer } = await getImageMeta(filePath)
  const { data } = await sharp(buffer)
    .resize(32, 32, { fit: 'cover' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  return Array.from(data)
}

function fingerprintDistance(a, b) {
  let sum = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) sum += Math.abs(a[i] - b[i])
  return sum / len
}

async function optimizeImage(inputBuffer, outBase, widths, options = {}) {
  const { crop = null, quality = 82 } = options
  const outputs = { jpg: null, webp: null, srcSet: [] }

  const largest = Math.max(...widths)
  let pipeline = sharp(inputBuffer, { failOn: 'none' }).rotate()
  if (crop) pipeline = pipeline.resize(crop.width, crop.height, { fit: 'cover', position: 'centre' })

  await fs.mkdir(path.dirname(outBase), { recursive: true })

  const jpgPath = `${outBase}.jpg`
  await pipeline
    .clone()
    .resize({ width: largest, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toFile(jpgPath)
  outputs.jpg = jpgPath

  const webpPath = `${outBase}.webp`
  await sharp(inputBuffer, { failOn: 'none' })
    .rotate()
    .resize(crop ? { width: crop.width, height: crop.height, fit: 'cover', position: 'centre' } : { width: largest, withoutEnlargement: true })
    .webp({ quality: quality - 4 })
    .toFile(webpPath)
  outputs.webp = webpPath

  for (const w of widths) {
    const sizedWebp = `${outBase}-${w}w.webp`
    await sharp(inputBuffer, { failOn: 'none' })
      .rotate()
      .resize(crop ? { width: crop.width, height: crop.height, fit: 'cover', position: 'centre' } : { width: w, withoutEnlargement: true })
      .webp({ quality: quality - 4 })
      .toFile(sizedWebp)
    outputs.srcSet.push({ width: w, path: sizedWebp })
  }

  return outputs
}

function toPublicUrl(absPath) {
  const rel = path.relative(path.join(ROOT, 'public'), absPath).split(path.sep).join('/')
  return `/${rel}`
}

function buildSrcSet(entries) {
  return entries.map((e) => `${toPublicUrl(e.path)} ${e.width}w`).join(', ')
}

async function archiveOriginals(files) {
  const archiveDir = path.join(IMAGES_ROOT, '_archive', new Date().toISOString().slice(0, 10))
  await fs.mkdir(archiveDir, { recursive: true })
  for (const file of files) {
    const dest = path.join(archiveDir, path.basename(file))
    try {
      await fs.rename(file, dest)
    } catch {
      // already moved
    }
  }
}

async function cleanGeneratedOutput() {
  const targets = ['hero', 'owner', 'before-after', ...Object.keys(GALLERY_CATEGORIES).map((s) => `gallery/${s}`)]
  for (const rel of targets) {
    const dir = path.join(IMAGES_ROOT, rel)
    if (!(await exists(dir))) continue
    const entries = await fs.readdir(dir)
    await Promise.all(entries.map((name) => fs.rm(path.join(dir, name), { force: true })))
  }
}

async function main() {
  console.log('Scanning for project photos...\n')

  const incomingFiles = await walkFiles(INCOMING)

  const allFiles = incomingFiles.filter((f) => {
    const base = path.basename(f).toLowerCase()
    return base !== 'readme.md'
  })

  if (allFiles.length === 0) {
    console.log('No photos found.')
    console.log(`Drop images into: ${INCOMING}`)
    console.log('Then run: npm run organize-images\n')

    const emptyManifest = {
      generated: false,
      generatedAt: new Date().toISOString(),
      imageCount: 0,
      hero: null,
      owner: null,
      beforeAfter: [],
      gallery: Object.fromEntries(
        Object.entries(GALLERY_CATEGORIES).map(([slug, meta]) => [slug, { title: meta.title, seo: meta.seo, items: [] }]),
      ),
    }
    await fs.writeFile(MANIFEST_PATH, JSON.stringify(emptyManifest, null, 2))
    return
  }

  const filteredFiles = allFiles.filter((f) => !SKIP_FILES.has(basenameKey(path.basename(f))))
  const skipped = allFiles.length - filteredFiles.length
  if (skipped) console.log(`Skipping ${skipped} unrelated/personal file(s)\n`)

  console.log(`Found ${filteredFiles.length} media file(s)\n`)

  await cleanGeneratedOutput()

  const images = []
  const videos = []
  const skippedLog = []

  for (const file of filteredFiles) {
    const ext = path.extname(file).toLowerCase()
    if (VIDEO_EXT.has(ext)) {
      const stat = await fs.stat(file)
      if (stat.size > MAX_VIDEO_BYTES) {
        skippedLog.push(`${path.basename(file)} (video too large: ${(stat.size / 1024 / 1024).toFixed(1)} MB)`)
        continue
      }
      videos.push(file)
      continue
    }
    try {
      const meta = await getImageMeta(file)
      const ba = parseBeforeAfter(path.basename(file, ext))
      const pathCategory = classifyByPath(file)
      images.push({
        file,
        ext,
        ...meta,
        ba,
        pathCategory,
        fingerprint: await fingerprint(file),
      })
    } catch (err) {
      console.warn(`Skipping unreadable file: ${file} (${err.message})`)
    }
  }

  const beforeAfterCandidates = images.filter((img) => img.ba || img.pathCategory === 'before-after')
  const galleryImages = images.filter((img) => !img.ba && img.pathCategory !== 'before-after')

  const pairs = []
  const used = new Set()

  for (const [beforeName, afterName] of MANUAL_PAIRS) {
    const before = findImageByBasename(images, beforeName)
    const after = findImageByBasename(images, afterName)
    if (!before || !after) continue
    const id = slugify(beforeName.replace(/\.[^.]+$/, ''))
    pairs.push({ before, after, id })
    used.add(before.file)
    used.add(after.file)
  }

  for (const img of beforeAfterCandidates) {
    if (used.has(img.file)) continue
    if (img.ba?.phase) {
      const partner = beforeAfterCandidates.find(
        (other) =>
          !used.has(other.file) &&
          other.file !== img.file &&
          other.ba?.phase &&
          other.ba.phase !== img.ba.phase &&
          (other.ba.base === img.ba.base ||
            slugify(other.ba.base) === slugify(img.ba.base) ||
            Math.abs(other.width - img.width) < 80),
      )
      if (partner) {
        const before = img.ba.phase === 'before' ? img : partner
        const after = img.ba.phase === 'after' ? img : partner
        pairs.push({ before, after, id: slugify(img.ba.base || path.basename(img.file, img.ext)) })
        used.add(img.file)
        used.add(partner.file)
      }
    }
  }

  for (const img of images) {
    if (used.has(img.file)) continue
    let best = null
    let bestDist = Infinity
    for (const other of images) {
      if (other.file === img.file || used.has(other.file)) continue
      if (Math.abs(other.width - img.width) > 40 || Math.abs(other.height - img.height) > 40) continue
      const numA = path.basename(img.file).match(/img_(\d+)/i)?.[1]
      const numB = path.basename(other.file).match(/img_(\d+)/i)?.[1]
      if (!numA || !numB || Math.abs(Number(numA) - Number(numB)) > 3) continue
      const dist = fingerprintDistance(img.fingerprint, other.fingerprint)
      const brightnessDiff = Math.abs(img.meanBrightness - other.meanBrightness)
      if (dist < 22 && brightnessDiff > 12 && dist < bestDist) {
        best = other
        bestDist = dist
      }
    }
    if (best) {
      const before = img.meanBrightness < best.meanBrightness ? img : best
      const after = img.meanBrightness < best.meanBrightness ? best : img
      const id = slugify(path.basename(before.file, before.ext))
      pairs.push({ before, after, id })
      used.add(img.file)
      used.add(best.file)
    }
  }

  const categorized = Object.fromEntries(Object.keys(GALLERY_CATEGORIES).map((k) => [k, []]))

  for (const img of images) {
    if (used.has(img.file)) continue
    const category = classifyImage(img)
    if (!categorized[category]) categorized[category] = []
    categorized[category].push(img)
    used.add(img.file)
  }

  let heroCandidate = null
  for (const name of HERO_PRIORITY) {
    const img = findImageByBasename(images, name)
    if (!img) continue
    if (pairs.some((p) => p.before.file === img.file || p.after.file === img.file)) continue
    if (img.orientation === 'landscape' || img.width >= 1200) {
      heroCandidate = img
      break
    }
  }

  if (!heroCandidate) {
    let heroScore = -1
    for (const img of images) {
      if (pairs.some((p) => p.before.file === img.file || p.after.file === img.file)) continue
      let score = 0
      if (img.orientation === 'landscape') score += 40
      score += Math.min(img.width / 50, 40)
      if (score > heroScore) {
        heroScore = score
        heroCandidate = img
      }
    }
  }

  const ownerImg = findImageByBasename(images, OWNER_FILE)

  console.log('Optimizing images...')

  const manifest = {
    generated: true,
    generatedAt: new Date().toISOString(),
    imageCount: images.length,
    hero: null,
    owner: null,
    beforeAfter: [],
    gallery: {},
  }

  if (heroCandidate) {
    const outBase = path.join(IMAGES_ROOT, 'hero', 'hero-bg')
    const optimized = await optimizeImage(heroCandidate.buffer, outBase, WIDTHS.hero, { quality: 85 })
    manifest.hero = {
      src: toPublicUrl(optimized.jpg),
      webp: toPublicUrl(optimized.webp),
      srcSet: buildSrcSet(optimized.srcSet),
      alt: 'Professional exterior cleaning for homes in Modesto and the Central Valley',
      width: heroCandidate.width,
      height: heroCandidate.height,
    }
    console.log(`  Hero: ${path.basename(heroCandidate.file)}`)
  }

  if (ownerImg) {
    const outBase = path.join(IMAGES_ROOT, 'owner', 'mike')
    const optimized = await optimizeImage(ownerImg.buffer, outBase, WIDTHS.owner, {
      quality: 85,
      crop: { width: 800, height: 800 },
    })
    manifest.owner = {
      src: toPublicUrl(optimized.jpg),
      webp: toPublicUrl(optimized.webp),
      srcSet: buildSrcSet(optimized.srcSet),
      alt: "Mike — owner of Mike's Exterior Cleaning Services",
    }
    console.log(`  Owner: ${path.basename(ownerImg.file)}`)
  }

  let pairIndex = 0
  for (const pair of pairs) {
    pairIndex += 1
    const id = pair.id || `comparison-${pairIndex}`
    const serviceSlug = classifyImage(pair.before)
    const label = `${GALLERY_CATEGORIES[serviceSlug]?.title || 'Exterior Cleaning'} — Modesto`

    const beforeBase = path.join(IMAGES_ROOT, 'before-after', `${id}-before`)
    const afterBase = path.join(IMAGES_ROOT, 'before-after', `${id}-after`)

    const beforeOpt = await optimizeImage(pair.before.buffer, beforeBase, WIDTHS.beforeAfter)
    const afterOpt = await optimizeImage(pair.after.buffer, afterBase, WIDTHS.beforeAfter)

    manifest.beforeAfter.push({
      id,
      label,
      before: toPublicUrl(beforeOpt.jpg),
      after: toPublicUrl(afterOpt.jpg),
      beforeWebp: toPublicUrl(beforeOpt.webp),
      afterWebp: toPublicUrl(afterOpt.webp),
      beforeSrcSet: buildSrcSet(beforeOpt.srcSet),
      afterSrcSet: buildSrcSet(afterOpt.srcSet),
    })
    console.log(`  Before/After pair: ${id}`)
  }

  for (const [slug, meta] of Object.entries(GALLERY_CATEGORIES)) {
    const items = []
    let index = 0

    for (const img of categorized[slug]) {
      if (heroCandidate && img.file === heroCandidate.file) continue
      if (ownerImg && img.file === ownerImg.file) continue
      index += 1
      const name = `${slug}-${String(index).padStart(2, '0')}`
      const outBase = path.join(IMAGES_ROOT, 'gallery', slug, name)
      const optimized = await optimizeImage(img.buffer, outBase, WIDTHS.gallery)

      items.push({
        type: 'image',
        src: toPublicUrl(optimized.jpg),
        webp: toPublicUrl(optimized.webp),
        srcSet: buildSrcSet(optimized.srcSet),
        alt: `${meta.title} in Modesto — Mike's Exterior Cleaning Services project photo ${index}`,
        width: img.width,
        height: img.height,
      })
    }

  manifest.gallery[slug] = { title: meta.title, seo: meta.seo, items }
    if (items.length) console.log(`  ${meta.title}: ${items.length} photo(s)`)
  }

  for (const video of videos) {
    const slug = classifyByFilename(path.basename(video))
    const category = GALLERY_CATEGORIES[slug] ? slug : 'pressure-washing'
    if (!manifest.gallery[category]) {
      manifest.gallery[category] = { title: GALLERY_CATEGORIES[category]?.title || category, seo: '', items: [] }
    }
    const index = manifest.gallery[category].items.length + 1
    const name = `${category}-${String(index).padStart(2, '0')}${path.extname(video).toLowerCase()}`
    const dest = path.join(IMAGES_ROOT, 'gallery', category, name)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.copyFile(video, dest)
    manifest.gallery[category].items.push({
      type: 'video',
      src: toPublicUrl(dest),
      alt: `${manifest.gallery[category].title} project video`,
    })
    console.log(`  Video: ${name}`)
  }

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  await archiveOriginals(incomingFiles)

  if (skippedLog.length) {
    console.log('\nSkipped files:')
    skippedLog.forEach((line) => console.log(`  - ${line}`))
  }

  console.log(`\nDone! Processed ${images.length} images, ${pairs.length} before/after pair(s).`)
  console.log(`Manifest: ${MANIFEST_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
