#!/usr/bin/env node
/**
 * Snapshot published projects for public placements.
 * Avoids relying solely on live /api/projects (which can fail behind Preview SSO).
 */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { listProjects } from '../lib/projectsStore.mjs'
import { toPublicProjectCard, isPublicProjectsConfigured } from '../lib/projectsPublic.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'public/data')
const outPath = join(outDir, 'published-projects.json')

let projects = []
if (isPublicProjectsConfigured()) {
  try {
    const published = await listProjects('published')
    projects = published
      .filter((p) => p?.status === 'published')
      .map((p) => toPublicProjectCard(p))
      .filter(Boolean)
      .sort((a, b) => {
        const aKey = String(a.publishedAt || a.completedAt || '')
        const bKey = String(b.publishedAt || b.completedAt || '')
        return bKey.localeCompare(aKey)
      })
  } catch (err) {
    console.warn('[generate-published-projects] skipped:', err?.message || err)
  }
}

mkdirSync(outDir, { recursive: true })
const payload = {
  generatedAt: new Date().toISOString(),
  projects,
}
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.log(`Wrote ${outPath} with ${projects.length} published project(s)`)
