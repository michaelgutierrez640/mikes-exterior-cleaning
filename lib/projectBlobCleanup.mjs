import { del } from '@vercel/blob'
import { listProjects } from './projectsStore.mjs'

/**
 * Delete Vercel Blob objects by URL. Soft-fails per URL.
 * @param {string[]} urls
 * @param {{ token?: string }} [opts]
 * @returns {Promise<{ deleted: number, errors: Array<{ url: string, error: string }> }>}
 */
export async function deleteBlobUrls(urls = [], opts = {}) {
  const unique = [...new Set((urls || []).map((u) => String(u || '').trim()).filter(Boolean))]
  const token = String(opts.token || process.env.BLOB_READ_WRITE_TOKEN || '').trim()
  if (!unique.length || !token) {
    return { deleted: 0, errors: [] }
  }

  const errors = []
  let deleted = 0
  for (const url of unique) {
    try {
      await del(url, { token })
      deleted += 1
    } catch (err) {
      errors.push({ url, error: err?.message || 'delete failed' })
    }
  }
  return { deleted, errors }
}

/**
 * Return URLs that are not referenced by any project photo (optionally ignoring one project).
 * @param {string[]} candidateUrls
 * @param {{ exceptProjectId?: string }} [opts]
 */
export async function findUnusedPhotoUrls(candidateUrls = [], { exceptProjectId = '' } = {}) {
  const candidates = [...new Set((candidateUrls || []).map((u) => String(u || '').trim()).filter(Boolean))]
  if (!candidates.length) return []

  const projects = await listProjects('all')
  const used = new Set()
  for (const project of projects) {
    if (exceptProjectId && project?.id === exceptProjectId) continue
    for (const photo of project?.photos || []) {
      const url = String(photo?.url || '').trim()
      if (url) used.add(url)
    }
  }

  return candidates.filter((url) => !used.has(url))
}

/**
 * After a project photo list changes, delete Blob objects that are no longer used anywhere.
 * @param {string[]} removedUrls
 * @param {{ exceptProjectId?: string }} [opts]
 */
export async function cleanupRemovedProjectPhotos(removedUrls = [], opts = {}) {
  const unused = await findUnusedPhotoUrls(removedUrls, opts)
  if (!unused.length) return { deleted: 0, errors: [], skippedInUse: removedUrls.length }
  const result = await deleteBlobUrls(unused)
  return {
    ...result,
    skippedInUse: Math.max(0, removedUrls.length - unused.length),
  }
}
