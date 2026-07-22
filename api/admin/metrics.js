import { computeDashboardMetrics } from '../../lib/analyticsStore.mjs'
import { json, requireAdmin } from '../../lib/adminAuth.mjs'
import {
  getDeliveryPreview,
  getReportAdminStatus,
  listDeliveryHistory,
  updateReportSettings,
} from '../../lib/reportStore.mjs'
import {
  addDaysToDateKey,
  formatDisplayDate,
  formatMonthLabel,
  getPreviousMonthRange,
  getPreviousWeekRange,
  getPriorMonthRange,
  getPriorWeekRange,
  pacificDayBoundMs,
} from '../../lib/reportTime.mjs'
import { runReport } from '../../lib/reportSend.mjs'

async function parseBody(req) {
  const raw = req.body
  if (raw !== undefined && raw !== null && raw !== '') {
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw)
      } catch {
        return {}
      }
    }
    if (typeof raw === 'object') return raw
  }
  return {}
}

function weeklyRangeFromPeriodKey(periodKey) {
  const match = String(periodKey).match(/^weekly:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})/)
  if (!match) return null
  return {
    type: 'weekly',
    startDate: match[1],
    endDate: match[2],
    periodKey: `weekly:${match[1]}:${match[2]}`,
    label: `${formatDisplayDate(match[1])} – ${formatDisplayDate(match[2])}`,
    startMs: pacificDayBoundMs(match[1], 'start'),
    endMs: pacificDayBoundMs(match[2], 'end'),
  }
}

function monthlyRangeFromPeriodKey(periodKey) {
  const match = String(periodKey).match(/^monthly:(\d{4}-\d{2})/)
  if (!match) return null
  const ym = match[1]
  const [y, m] = ym.split('-').map(Number)
  const startDate = `${ym}-01`
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  const nextStart = `${nextY}-${String(nextM).padStart(2, '0')}-01`
  const endDate = addDaysToDateKey(nextStart, -1)
  return {
    type: 'monthly',
    startDate,
    endDate,
    periodKey: `monthly:${ym}`,
    label: formatMonthLabel(ym),
    yearMonth: ym,
    startMs: pacificDayBoundMs(startDate, 'start'),
    endMs: pacificDayBoundMs(endDate, 'end'),
  }
}

export default async function handler(req, res) {
  const auth = requireAdmin(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  const view = typeof req.query?.view === 'string' ? req.query.view : ''

  if (req.method === 'GET') {
    try {
      if (view === 'reports') {
        const [status, history] = await Promise.all([getReportAdminStatus(), listDeliveryHistory(50)])
        return json(res, 200, { ...status, history })
      }
      if (view === 'report-preview') {
        const periodKey = typeof req.query?.periodKey === 'string' ? req.query.periodKey : ''
        if (!periodKey) return json(res, 400, { error: 'periodKey required' })
        const preview = await getDeliveryPreview(periodKey)
        if (!preview) return json(res, 404, { error: 'Report not found' })
        return json(res, 200, preview)
      }

      const metrics = await computeDashboardMetrics()
      return json(res, 200, metrics)
    } catch (err) {
      console.error('[admin/metrics] error:', err?.message || err)
      return json(res, 503, {
        error: view ? 'Reports storage unavailable' : 'Analytics storage not configured',
        hint: 'Connect Upstash Redis in Vercel Storage (KV_REST_API_URL + KV_REST_API_TOKEN)',
      })
    }
  }

  if (req.method === 'POST') {
    const body = await parseBody(req)
    const action = String(body.action || '').trim()

    try {
      if (action === 'update-settings') {
        const settings = await updateReportSettings({
          weeklyEnabled: body.weeklyEnabled,
          monthlyEnabled: body.monthlyEnabled,
          recipientEmailHint: body.recipientEmailHint,
        })
        return json(res, 200, { ok: true, settings })
      }

      if (action === 'generate-preview') {
        const type = body.type === 'monthly' ? 'monthly' : 'weekly'
        const range = type === 'weekly' ? getPreviousWeekRange() : getPreviousMonthRange()
        const priorRange = type === 'weekly' ? getPriorWeekRange(range) : getPriorMonthRange(range)
        const result = await runReport(type, { send: false, range, priorRange })
        return json(res, 200, result)
      }

      if (action === 'send-test') {
        const type = body.type === 'monthly' ? 'monthly' : 'weekly'
        const range = type === 'weekly' ? getPreviousWeekRange() : getPreviousMonthRange()
        const priorRange = type === 'weekly' ? getPriorWeekRange(range) : getPriorMonthRange(range)
        const result = await runReport(type, { send: true, isTest: true, force: true, range, priorRange })
        if (!result.ok) return json(res, 502, result)
        return json(res, 200, result)
      }

      if (action === 'resend') {
        const type = body.type === 'monthly' ? 'monthly' : 'weekly'
        const periodKey = String(body.periodKey || '').trim()
        if (!periodKey) return json(res, 400, { error: 'periodKey required' })

        const range = type === 'weekly' ? weeklyRangeFromPeriodKey(periodKey) : monthlyRangeFromPeriodKey(periodKey)
        if (!range) return json(res, 400, { error: 'Invalid periodKey' })
        const priorRange = type === 'weekly' ? getPriorWeekRange(range) : getPriorMonthRange(range)

        const result = await runReport(type, { send: true, force: true, range, priorRange })
        if (!result.ok) return json(res, 502, result)
        return json(res, 200, result)
      }

      return json(res, 400, { error: 'Unknown action' })
    } catch (err) {
      console.error('[admin/metrics] report action error:', err?.message || err)
      const status = err?.status || 500
      return json(res, status, { error: err?.message || 'Report action failed' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return json(res, 405, { error: 'Method not allowed' })
}
