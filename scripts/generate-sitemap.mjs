#!/usr/bin/env node
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { buildSitemapXml, getSitemapUrlCount } from '../lib/sitemap.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const xml = buildSitemapXml()
const outPath = join(root, 'public/sitemap.xml')

writeFileSync(outPath, xml, { encoding: 'utf8' })
console.log(`Wrote ${outPath} with ${getSitemapUrlCount()} URLs`)
