import { json, requireAdmin } from '../../lib/adminAuth.mjs'
import {
  getHiddenOurWorkSrcs,
  hideStaticOurWorkPhoto,
  isOurWorkGalleryStorageConfigured,
  listPublishedJobPhotos,
  listStaticOurWorkPhotos,
} from '../../lib/ourWorkGalleryStore.mjs'

/**
 * Admin inventory for the homepage Our Work gallery.
 * - GET  /api/admin/our-work-gallery
 * - DELETE /api/admin/our-work-gallery  body: { src }
 */
export default async function handler(req, res) {
  const auth = requireAdmin(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  if (!isOurWorkGalleryStorageConfigured()) {
    return json(res, 503, {
      error: 'Gallery storage not configured',
      hint: 'Connect Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)',
    })
  }

  try {
    if (req.method === 'GET') {
      const hiddenSrcs = await getHiddenOurWorkSrcs()
      const staticPhotos = listStaticOurWorkPhotos({ hiddenSrcs }).filter((p) => !p.hidden)
      const publishedJobPhotos = await listPublishedJobPhotos()
      return json(res, 200, {
        photos: [...staticPhotos, ...publishedJobPhotos],
        hiddenSrcs,
        counts: {
          staticVisible: staticPhotos.length,
          publishedJob: publishedJobPhotos.length,
          hidden: hiddenSrcs.length,
        },
      })
    }

    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const src = String(body.src || req.query?.src || '').trim()
      const result = await hideStaticOurWorkPhoto(src)
      return json(res, 200, { ok: true, ...result })
    }

    res.setHeader('Allow', 'GET, DELETE')
    return json(res, 405, { error: 'Method not allowed' })
  } catch (err) {
    console.error('[admin/our-work-gallery]', err?.message || err)
    const status = err?.status || 500
    return json(res, status, { error: err?.message || 'Our Work gallery request failed' })
  }
}
