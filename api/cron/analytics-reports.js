/**
 * Secure daily cron for:
 * 1) weekly/monthly analytics email reports
 * 2) SMS automations (24h appointment reminders + delayed review requests)
 *
 * Kept in one serverless function + one vercel.json cron to stay on Hobby limits.
 *
 * Auth: Authorization: Bearer CRON_SECRET (Vercel Cron) or x-cron-secret header.
 * Schedule: vercel.json "0 15 * * *" (15:00 UTC ≈ 8:00 AM PDT / 7:00 AM PST).
 * Weekly send only when America/Los_Angeles weekday is Monday.
 * SMS reminders target appointments dated "tomorrow" in America/Los_Angeles.
 */
import { runScheduledReports, verifyCronSecret } from '../../lib/reportSend.mjs'
import { saveCronRunStatus } from '../../lib/reportStore.mjs'
import { runSmsCronJobs } from '../../lib/smsCron.mjs'
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

  let reports = null
  let reportsError = null
  try {
    reports = await runScheduledReports()
    // Avoid logging email bodies or secrets
    console.info('[cron/analytics-reports]', {
      weekly: reports.results?.find((r) => r.type === 'weekly')?.skipped
        ? reports.results.find((r) => r.type === 'weekly').reason
        : reports.results?.find((r) => r.type === 'weekly')?.sent
          ? 'sent'
          : reports.results?.find((r) => r.type === 'weekly')?.ok === false
            ? 'failed'
            : 'ok',
      monthly: reports.results?.find((r) => r.type === 'monthly')?.skipped
        ? reports.results.find((r) => r.type === 'monthly').reason
        : reports.results?.find((r) => r.type === 'monthly')?.sent
          ? 'sent'
          : reports.results?.find((r) => r.type === 'monthly')?.ok === false
            ? 'failed'
            : 'ok',
    })
  } catch (err) {
    reportsError = err?.message || 'Report cron failed'
    console.error('[cron/analytics-reports] error:', reportsError)
    await saveCronRunStatus({
      lastRunAt: new Date().toISOString(),
      lastOk: false,
      lastError: reportsError,
      weekly: { outcome: 'error' },
      monthly: { outcome: 'error' },
    }).catch(() => {})
  }

  let sms = null
  let smsError = null
  try {
    sms = await runSmsCronJobs()
  } catch (err) {
    smsError = err?.message || 'SMS cron failed'
    console.error('[cron/sms-automations] error:', smsError)
  }

  // Prefer 200 when either job succeeds so Vercel doesn't hammer retries that could
  // complicate the other subsystem. Individual idempotency stamps protect SMS.
  if (reportsError && smsError) {
    return json(res, 500, { error: 'Daily cron failed', reportsError, smsError })
  }

  return json(res, 200, {
    ok: true,
    reports: reports || { ok: false, error: reportsError },
    sms: sms || { ok: false, error: smsError },
  })
}
