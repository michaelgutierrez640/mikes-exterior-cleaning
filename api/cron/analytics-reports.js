/**
 * Secure daily cron for weekly/monthly analytics email reports.
 * Replaces unused debug analytics slot to stay within Hobby 12-function limit.
 *
 * Auth: Authorization: Bearer CRON_SECRET (Vercel Cron) or x-cron-secret header.
 */
import { runScheduledReports, verifyCronSecret } from '../lib/reportSend.mjs'
import { json } from '../lib/adminAuth.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const auth = verifyCronSecret(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  try {
    const result = await runScheduledReports()
    // Avoid logging email bodies or secrets
    console.info('[cron/analytics-reports]', {
      weekly: result.results?.find((r) => r.type === 'weekly')?.skipped
        ? result.results.find((r) => r.type === 'weekly').reason
        : result.results?.find((r) => r.type === 'weekly')?.sent
          ? 'sent'
          : result.results?.find((r) => r.type === 'weekly')?.ok === false
            ? 'failed'
            : 'ok',
      monthly: result.results?.find((r) => r.type === 'monthly')?.skipped
        ? result.results.find((r) => r.type === 'monthly').reason
        : result.results?.find((r) => r.type === 'monthly')?.sent
          ? 'sent'
          : result.results?.find((r) => r.type === 'monthly')?.ok === false
            ? 'failed'
            : 'ok',
    })
    return json(res, 200, result)
  } catch (err) {
    console.error('[cron/analytics-reports] error:', err?.message || err)
    return json(res, 500, { error: 'Report cron failed' })
  }
}
