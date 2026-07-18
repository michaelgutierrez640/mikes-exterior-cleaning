import { computeDashboardMetrics } from '../../lib/analyticsStore.mjs'
import { json, requireAdmin } from '../../lib/adminAuth.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const auth = requireAdmin(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  try {
    const metrics = await computeDashboardMetrics()
    return json(res, 200, metrics)
  } catch (err) {
    console.error('[admin/metrics] storage error:', err?.message || err)
    return json(res, 503, {
      error: 'Analytics storage not configured',
      hint: 'Connect Upstash Redis in Vercel Storage (KV_REST_API_URL + KV_REST_API_TOKEN)',
    })
  }
}
