#!/usr/bin/env node
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sitemapPath = join(__dirname, '..', 'public/sitemap.xml')
const xml = readFileSync(sitemapPath, 'utf8')

const errors = []

if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
  errors.push('Missing or invalid XML declaration')
}

if (xml.charCodeAt(0) === 0xfeff) {
  errors.push('Sitemap must not include a UTF-8 BOM')
}

if (!xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) {
  errors.push('Missing correct urlset namespace')
}

if (!xml.trimEnd().endsWith('</urlset>')) {
  errors.push('Missing closing </urlset> tag')
}

if (/<html[\s>]/i.test(xml)) {
  errors.push('Sitemap contains HTML — likely SPA rewrite served index.html instead of XML')
}

const urlBlocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
if (!urlBlocks.length) {
  errors.push('No <url> entries found')
}

for (const [index, match] of urlBlocks.entries()) {
  const block = match[1]
  const n = index + 1
  for (const tag of ['loc', 'lastmod', 'changefreq', 'priority']) {
    if (!new RegExp(`<${tag}>[^<]+</${tag}>`).test(block)) {
      errors.push(`URL #${n} missing <${tag}>`)
    }
  }
  const loc = block.match(/<loc>([^<]*)<\/loc>/)?.[1]
  if (loc && !loc.startsWith('https://www.mikesexteriorcleaning.com')) {
    errors.push(`URL #${n} loc must use https://www.mikesexteriorcleaning.com — got ${loc}`)
  }
}

if (errors.length) {
  console.error('Sitemap validation FAILED:')
  for (const err of errors) console.error(`  - ${err}`)
  process.exit(1)
}

console.log(`Sitemap validation passed (${urlBlocks.length} URLs)`)
