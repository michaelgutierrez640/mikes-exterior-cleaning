import { json, requireAdmin } from '../../lib/adminAuth.mjs'

/** Lightweight auth probe for admin UI (does not require Redis or Blob). */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const auth = requireAdmin(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  return json(res, 200, { ok: true })
}
