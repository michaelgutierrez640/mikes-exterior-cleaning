import { json } from '../lib/adminAuth.mjs'
import {
  getHiddenOurWorkSrcs,
  isOurWorkGalleryStorageConfigured,
} from '../lib/ourWorkGalleryStore.mjs'

/**
 * Public read of Our Work gallery hide-list (src paths only).
 * Used by the homepage gallery to filter static photos removed in admin.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return json(res, 405, { error: 'Method not allowed' })
  }

  try {
    if (!isOurWorkGalleryStorageConfigured()) {
      return json(res, 200, { hiddenSrcs: [] })
    }
    const hiddenSrcs = await getHiddenOurWorkSrcs()
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    return json(res, 200, { hiddenSrcs })
  } catch (err) {
    console.error('[our-work-gallery]', err?.message || err)
    return json(res, 200, { hiddenSrcs: [] })
  }
}
