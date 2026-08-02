/**
 * Build a resized WebP URL for Vercel Blob job photos used as gallery/project thumbs.
 * Full-resolution originals remain available via the original HTTPS URL (lightbox / downloads).
 */
export function isVercelBlobImageUrl(url) {
  return /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(String(url || ''))
}

export function optimizedImageUrl(url, width = 900) {
  const src = String(url || '').trim()
  if (!isVercelBlobImageUrl(src)) return src
  const w = Math.min(Math.max(Number(width) || 900, 160), 1600)
  // Reuses the existing /api/projects serverless function (Hobby plan function limit).
  return `/api/projects?resource=img&url=${encodeURIComponent(src)}&w=${w}`
}
