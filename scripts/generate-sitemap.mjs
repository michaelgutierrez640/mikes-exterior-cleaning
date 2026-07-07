#!/usr/bin/env node
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const SITE = 'https://www.mikesexteriorcleaning.com'
const LASTMOD = new Date().toISOString().split('T')[0]
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const services = [
  'window-cleaning',
  'pressure-washing',
  'solar-panel-cleaning',
  'gutter-cleaning',
  'commercial-window-cleaning',
]

const priorityLocations = ['modesto', 'salida', 'riverbank', 'ceres', 'turlock', 'ripon', 'oakdale']
const allCities = ['modesto', 'salida', 'riverbank', 'oakdale', 'ripon', 'turlock', 'ceres', 'manteca', 'tracy', 'stockton']
const wcCities = ['modesto', 'salida', 'riverbank', 'oakdale', 'ripon', 'turlock', 'ceres', 'tracy', 'stockton']

const articles = [
  'how-often-clean-windows-modesto-ca',
  'hard-water-stains-central-valley-windows',
  'best-time-pressure-wash-driveways-stanislaus-county',
  'solar-panel-cleaning-california-dust-pollen',
  'gutter-cleaning-before-rainy-season-modesto',
  'spring-pollen-window-cleaning-central-valley',
  'commercial-storefront-cleaning-modesto',
  'pressure-washing-vs-soft-wash-central-valley',
  'why-hire-professional-window-cleaners',
  'exterior-cleaning-home-curb-appeal-value',
  'agricultural-dust-exterior-cleaning-turlock',
  'two-story-window-cleaning-safety',
  'gutter-overflow-damage-prevention-ripon',
  'oakdale-ranch-property-exterior-maintenance',
  'ceres-homeowner-exterior-cleaning-checklist',
]

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function url(loc, priority, changefreq = 'monthly') {
  const href = escapeXml(`${SITE}${loc}`)
  return [
    '  <url>',
    `    <loc>${href}</loc>`,
    `    <lastmod>${LASTMOD}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n')
}

const urls = [
  url('/', '1.0', 'weekly'),
  url('/resources', '0.8'),
  url('/instant-quote', '0.9'),
  url('/book-online', '0.9'),
  url('/service-areas', '0.85'),
  ...services.map((s) => url(`/services/${s}`, '0.9')),
  ...articles.map((a) => url(`/resources/${a}`, '0.75')),
  ...allCities.map((c) => url(`/service-areas/${c}`, priorityLocations.includes(c) ? '0.85' : '0.75')),
  ...wcCities.map((c) => url(`/window-cleaning/${c}`, '0.8')),
]

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls,
  '</urlset>',
  '',
].join('\n')

const outPath = join(root, 'public/sitemap.xml')
writeFileSync(outPath, xml, { encoding: 'utf8' })
console.log(`Wrote ${outPath} with ${urls.length} URLs`)
