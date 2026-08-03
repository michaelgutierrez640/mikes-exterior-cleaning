#!/usr/bin/env node
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import {
  buildSitemapXml,
  getSitemapUrlCount,
  serviceCityEntriesFromProjects,
} from '../lib/sitemap.mjs'
import { listPublishedProjectSitemapEntries } from '../lib/projectsPublic.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const publishedProjects = await listPublishedProjectSitemapEntries()
const serviceCityCount = serviceCityEntriesFromProjects(publishedProjects).length
const xml = buildSitemapXml(undefined, publishedProjects)
const outPath = join(root, 'public/sitemap.xml')

writeFileSync(outPath, xml, { encoding: 'utf8' })
console.log(
  `Wrote ${outPath} with ${getSitemapUrlCount(publishedProjects.length, serviceCityCount)} URLs` +
    ` (${publishedProjects.length} published projects, ${serviceCityCount} project-backed service×city)`,
)
