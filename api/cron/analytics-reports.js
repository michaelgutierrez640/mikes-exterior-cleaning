/**
 * Secure daily cron for weekly/monthly analytics email reports.
 * Replaces unused debug analytics slot to stay within Hobby 12-function limit.
 *
 * Auth: Authorization: Bearer CRON_SECRET (Vercel Cron) or x-cron-secret header.
 * Schedule: vercel.json "0 15 * * *" (15:00 UTC ≈ 8:00 AM PDT / 7:00 AM PST).
 * Weekly send only when America/Los_Angeles weekday is Monday.
 */
import { runScheduledReports, verifyCronSecret } from '../../lib/reportSend.mjs'
import { saveCronRunStatus } from '../../lib/reportStore.mjs'
import { json } from '../../lib/adminAuth.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const auth = verifyCronSecret(req)
  if (!auth.ok) {
    // Do not write Redis on auth failure (avoid abuse). Log only — no secrets.
    console.error('[cron/analytics-reports] auth failed', { status: auth.status })
    return json(res, auth.status, { error: auth.error })
  }

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
    await saveCronRunStatus({
      lastRunAt: new Date().toISOString(),
      lastOk: false,
      lastError: err?.message || 'Report cron failed',
      weekly: { outcome: 'error' },
      monthly: { outcome: 'error' },
    }).catch(() => {})
    return json(res, 500, { error: 'Report cron failed' })
  }
}
