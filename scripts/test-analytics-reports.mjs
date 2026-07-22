/**
 * Offline tests for analytics report date ranges, comparisons, and summaries.
 * Run: npm run test:reports
 */
import assert from 'assert'
import {
  getDueReportPeriods,
  getPreviousMonthRange,
  getPreviousWeekRange,
  getPriorMonthRange,
  getPriorWeekRange,
  pacificDateKey,
  pacificDayBoundMs,
  pacificWeekday,
} from '../lib/reportTime.mjs'
import { compareValues } from '../lib/reportCompare.mjs'
import { buildPlainLanguageSummary } from '../lib/reportSummary.mjs'
import { buildReportEmail } from '../lib/reportEmail.mjs'
import { wasSuccessfullyDelivered } from '../lib/reportStore.mjs'

function ptDate(isoLocal) {
  // Construct a Date that lands on a known PT calendar day by using UTC offset approx
  return new Date(isoLocal)
}

let passed = 0
function test(name, fn) {
  try {
    fn()
    passed += 1
    console.log(`✓ ${name}`)
  } catch (err) {
    console.error(`✗ ${name}`)
    console.error(err)
    process.exitCode = 1
  }
}

test('pacificDateKey formats America/Los_Angeles', () => {
  // 2026-07-22 10:00 UTC = 2026-07-22 03:00 PDT
  const key = pacificDateKey(new Date('2026-07-22T10:00:00.000Z'))
  assert.strictEqual(key, '2026-07-22')
})

test('weekly range on Monday is previous Mon–Sun', () => {
  // Monday Jul 20, 2026 16:00 UTC = Monday Jul 20 09:00 PDT
  const now = new Date('2026-07-20T16:00:00.000Z')
  assert.strictEqual(pacificWeekday(now), 1)
  const week = getPreviousWeekRange(now)
  assert.strictEqual(week.startDate, '2026-07-13')
  assert.strictEqual(week.endDate, '2026-07-19')
  assert.strictEqual(week.periodKey, 'weekly:2026-07-13:2026-07-19')
  assert.ok(week.startMs < week.endMs)
  assert.strictEqual(pacificDateKey(new Date(week.startMs)), '2026-07-13')
  assert.strictEqual(pacificDateKey(new Date(week.endMs)), '2026-07-19')
})

test('prior week is the week before', () => {
  const week = getPreviousWeekRange(new Date('2026-07-20T16:00:00.000Z'))
  const prior = getPriorWeekRange(week)
  assert.strictEqual(prior.startDate, '2026-07-06')
  assert.strictEqual(prior.endDate, '2026-07-12')
})

test('monthly range on 1st is previous calendar month', () => {
  // Aug 1, 2026 15:00 UTC = Aug 1 08:00 PDT
  const now = new Date('2026-08-01T15:00:00.000Z')
  const month = getPreviousMonthRange(now)
  assert.strictEqual(month.yearMonth, '2026-07')
  assert.strictEqual(month.startDate, '2026-07-01')
  assert.strictEqual(month.endDate, '2026-07-31')
  assert.strictEqual(month.periodKey, 'monthly:2026-07')
})

test('month/year boundary January → December prior year', () => {
  const now = new Date('2026-01-01T18:00:00.000Z') // Jan 1 morning PT
  const month = getPreviousMonthRange(now)
  assert.strictEqual(month.yearMonth, '2025-12')
  assert.strictEqual(month.startDate, '2025-12-01')
  assert.strictEqual(month.endDate, '2025-12-31')
  const prior = getPriorMonthRange(month)
  assert.strictEqual(prior.yearMonth, '2025-11')
})

test('due periods: Monday weekly only', () => {
  const due = getDueReportPeriods(new Date('2026-07-20T16:00:00.000Z'))
  assert.ok(due.weekly)
  assert.strictEqual(due.monthly, null)
})

test('due periods: 1st monthly; if also Monday both due', () => {
  // June 1 2026 was a Monday
  const due = getDueReportPeriods(new Date('2026-06-01T16:00:00.000Z'))
  assert.ok(due.weekly)
  assert.ok(due.monthly)
  assert.strictEqual(due.monthly.periodKey, 'monthly:2026-05')
})

test('due periods: mid-week neither', () => {
  const due = getDueReportPeriods(new Date('2026-07-22T16:00:00.000Z')) // Wednesday
  assert.strictEqual(due.weekly, null)
  assert.strictEqual(due.monthly, null)
})

test('day bounds do not spill into adjacent PT days', () => {
  const start = pacificDayBoundMs('2026-03-08', 'start') // DST spring forward weekend
  const end = pacificDayBoundMs('2026-03-08', 'end')
  assert.strictEqual(pacificDateKey(new Date(start)), '2026-03-08')
  assert.strictEqual(pacificDateKey(new Date(end)), '2026-03-08')
  assert.notStrictEqual(pacificDateKey(new Date(start - 1)), '2026-03-08')
  assert.notStrictEqual(pacificDateKey(new Date(end + 1)), '2026-03-08')
})

test('compareValues handles zeros without infinite %', () => {
  const a = compareValues(5, 0)
  assert.strictEqual(a.direction, 'increased')
  assert.strictEqual(a.percentChange, null)
  assert.match(a.percentLabel, /no prior baseline/)

  const b = compareValues(0, 0)
  assert.strictEqual(b.direction, 'unchanged')
  assert.strictEqual(b.percentChange, 0)

  const c = compareValues(8, 4)
  assert.strictEqual(c.percentChange, 100)
  assert.strictEqual(c.direction, 'increased')
})

test('duplicate delivery guard', () => {
  assert.strictEqual(wasSuccessfullyDelivered({ status: 'sent' }), true)
  assert.strictEqual(wasSuccessfullyDelivered({ status: 'failed' }), false)
  assert.strictEqual(wasSuccessfullyDelivered(null), false)
})

test('summary and email contain no invented PII fields', () => {
  const payload = {
    range: { label: 'Jul 13 – Jul 19, 2026', type: 'weekly' },
    uniqueVisitors: { available: true, value: 10 },
    pageViews: { available: true, value: 40 },
    totalLeads: { available: true, value: 0 },
    instantQuoteStarts: { available: true, value: 3 },
    instantQuoteCompletions: { available: true, value: 0 },
    phoneClicks: { available: true, value: 2 },
    topPages: { available: true, value: [{ key: '/services/window-cleaning', count: 12 }] },
    trafficSources: { available: true, value: [{ key: 'Direct', count: 8 }] },
    referringDomains: { available: true, value: [] },
    deviceTypes: { available: true, value: { mobile: 5, desktop: 5 } },
    leadsByService: { available: true, value: [] },
    leadsByCity: { available: true, value: [] },
    contactFormSubmissions: { available: true, value: 0 },
    bookingRequests: { available: true, value: 0 },
    projectsPublished: { available: true, value: 1 },
    conversionRate: { available: true, value: 0 },
    comparisons: {
      uniqueVisitors: { available: true, direction: 'increased', displayDiff: '+2', percentLabel: '+25%' },
      totalLeads: { available: true, direction: 'unchanged', displayDiff: '0', percentLabel: '0%' },
      pageViews: { available: true, direction: 'increased', displayDiff: '+5', percentLabel: '+14.3%' },
      instantQuoteStarts: { available: true, direction: 'increased', displayDiff: '+1', percentLabel: '+50%' },
      instantQuoteCompletions: { available: true, direction: 'unchanged', displayDiff: '0', percentLabel: '0%' },
    },
  }
  const lines = buildPlainLanguageSummary(payload, 'weekly')
  assert.ok(lines.some((l) => /no new CRM leads/i.test(l) || /No new CRM leads/i.test(l)))
  assert.ok(lines.some((l) => /quote starts/i.test(l)))
  const email = buildReportEmail({
    type: 'weekly',
    payload,
    summaryLines: lines,
    adminUrl: 'https://www.mikesexteriorcleaning.com/admin/dashboard',
    businessName: "Mike's Exterior Cleaning Services",
  })
  assert.ok(email.html.includes('Weekly Website Report'))
  assert.ok(email.text.includes('KEY METRICS'))
  assert.ok(!/@gmail\.com/i.test(email.html))
  assert.ok(!/\b555[- ]?\d{3}/.test(email.html))
  assert.ok(!/\bJane Doe\b/i.test(email.html))
})

test('unused ptDate helper kept for clarity', () => {
  assert.ok(ptDate('2026-07-20T16:00:00.000Z') instanceof Date)
})

console.log(`\n${passed} tests completed`)
