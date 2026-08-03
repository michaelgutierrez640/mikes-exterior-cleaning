import { del } from '@vercel/blob'
import { listProjects } from './projectsStore.mjs'

/**
 * Delete Vercel Blob objects by public URL. Soft-fails per URL.
 * @param {string[]} urls
 * @returns {Promise<{ deleted: number, errors: Array<{ url: string, error: string }> }>}
 */
export async function deleteBlobUrls(urls = []) {
  const unique = [...new Set((urls || []).map((u) => String(u || '').trim()).filter(Boolean))]
  if (!unique.length || !process.env.BLOB_READ_WRITE_TOKEN) {
    return { deleted: 0, errors: [] }
  }

  const errors = []
  let deleted = 0
  for (const url of unique) {
    try {
      await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN })
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
      const poster = String(photo?.posterUrl || '').trim()
      if (poster) used.add(poster)
    }
  }

  return candidates.filter((url) => !used.has(url))
}

/** Collect media + poster URLs from a photo/media array. */
export function collectMediaUrls(media = []) {
  const urls = []
  for (const item of media || []) {
    const url = String(item?.url || '').trim()
    if (url) urls.push(url)
    const poster = String(item?.posterUrl || '').trim()
    if (poster) urls.push(poster)
  }
  return urls
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
