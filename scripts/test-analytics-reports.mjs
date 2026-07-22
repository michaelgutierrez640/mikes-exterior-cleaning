/**
 * Offline tests for analytics report date ranges, comparisons, summaries,
 * and analytics hygiene / funnel labeling.
 * Run: npm run test:reports
 */
import assert from 'assert'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
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
import { buildReportEmail, fmtQuoteCompletionRate } from '../lib/reportEmail.mjs'
import { wasSuccessfullyDelivered } from '../lib/reportStore.mjs'
import {
  isAdminAnalyticsPath,
  isNonProductionAnalyticsHost,
  shouldPersistAnalyticsEvent,
} from '../lib/analyticsFilter.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function ptDate(isoLocal) {
  return new Date(isoLocal)
}

function readSrc(rel) {
  return readFileSync(join(root, rel), 'utf8')
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
  const key = pacificDateKey(new Date('2026-07-22T10:00:00.000Z'))
  assert.strictEqual(key, '2026-07-22')
})

test('weekly range on Monday is previous Mon–Sun', () => {
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
  const now = new Date('2026-08-01T15:00:00.000Z')
  const month = getPreviousMonthRange(now)
  assert.strictEqual(month.yearMonth, '2026-07')
  assert.strictEqual(month.startDate, '2026-07-01')
  assert.strictEqual(month.endDate, '2026-07-31')
  assert.strictEqual(month.periodKey, 'monthly:2026-07')
})

test('month/year boundary January → December prior year', () => {
  const now = new Date('2026-01-01T18:00:00.000Z')
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
  const due = getDueReportPeriods(new Date('2026-06-01T16:00:00.000Z'))
  assert.ok(due.weekly)
  assert.ok(due.monthly)
  assert.strictEqual(due.monthly.periodKey, 'monthly:2026-05')
})

test('due periods: mid-week neither', () => {
  const due = getDueReportPeriods(new Date('2026-07-22T16:00:00.000Z'))
  assert.strictEqual(due.weekly, null)
  assert.strictEqual(due.monthly, null)
})

test('day bounds do not spill into adjacent PT days', () => {
  const start = pacificDayBoundMs('2026-03-08', 'start')
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

test('Preview and localhost hosts are excluded; Production hosts allowed', () => {
  assert.strictEqual(isNonProductionAnalyticsHost('www.mikesexteriorcleaning.com'), false)
  assert.strictEqual(isNonProductionAnalyticsHost('mikesexteriorcleaning.com'), false)
  assert.strictEqual(
    isNonProductionAnalyticsHost(
      'mikes-exterior-cleaning-git-cursor-analytics-1df7b0-jmrprojects.vercel.app',
    ),
    true,
  )
  assert.strictEqual(isNonProductionAnalyticsHost('localhost'), true)
  assert.strictEqual(isNonProductionAnalyticsHost('127.0.0.1'), true)
  assert.strictEqual(
    shouldPersistAnalyticsEvent({
      host: 'preview.vercel.app',
      path: '/instant-quote',
    }).persist,
    false,
  )
  assert.strictEqual(
    shouldPersistAnalyticsEvent({
      host: 'www.mikesexteriorcleaning.com',
      path: '/services/window-cleaning',
    }).persist,
    true,
  )
})

test('admin paths are excluded from Production analytics', () => {
  assert.strictEqual(isAdminAnalyticsPath('/admin'), true)
  assert.strictEqual(isAdminAnalyticsPath('/admin/dashboard'), true)
  assert.strictEqual(isAdminAnalyticsPath('/admin/reports?x=1'), true)
  assert.strictEqual(isAdminAnalyticsPath('/instant-quote'), false)
  assert.strictEqual(isAdminAnalyticsPath('/administrator'), false)
  const gate = shouldPersistAnalyticsEvent({
    host: 'www.mikesexteriorcleaning.com',
    path: '/admin/dashboard',
  })
  assert.strictEqual(gate.persist, false)
  assert.strictEqual(gate.reason, 'admin_path')
})

test('quote completion rate is n/a when starts are zero', () => {
  assert.strictEqual(
    fmtQuoteCompletionRate({ available: true, value: 0 }, { available: true, value: null }),
    'n/a (no quote starts)',
  )
  assert.strictEqual(
    fmtQuoteCompletionRate({ available: true, value: 4 }, { available: true, value: 0.5 }),
    '50%',
  )
})

test('session-deduped quote start: CTA does not fire start; calculator does', () => {
  const buttonSrc = readSrc('src/components/ui/Button.jsx')
  const instantQuoteFn = buttonSrc.match(/export function InstantQuoteButton[\s\S]*?\n}/)?.[0] || ''
  const calc = readSrc('src/components/quote/InstantQuoteCalculator.jsx')
  const analytics = readSrc('src/utils/analytics.js')
  assert.ok(!/trackQuoteStarted|instant_quote_started/.test(instantQuoteFn))
  assert.ok(calc.includes('trackQuoteStarted()'))
  assert.ok(analytics.includes('QUOTE_STARTED_SESSION_KEY'))
  assert.ok(analytics.includes('sessionStorage.getItem(QUOTE_STARTED_SESSION_KEY)'))
})

test('quote completion has single trackQuoteSubmitted path and submit lock', () => {
  const form = readSrc('src/components/quote/QuoteContactForm.jsx')
  assert.ok(form.includes('trackQuoteSubmitted'))
  assert.ok(form.includes('submitLock'))
  assert.ok(!form.includes("trackInternalEvent('instant_quote_completed'"))
  assert.strictEqual((form.match(/trackQuoteSubmitted/g) || []).length, 2) // import + call
})

test('public phone links use PhoneLink or CallButton (not raw phoneHref anchors)', () => {
  const files = [
    'src/components/layout/Header.jsx',
    'src/components/layout/Footer.jsx',
    'src/components/sections/Contact.jsx',
    'src/components/sections/Hero.jsx',
    'src/pages/InstantQuotePage.jsx',
    'src/pages/BookOnlinePage.jsx',
    'src/components/quote/QuoteConfirmation.jsx',
  ]
  for (const file of files) {
    const src = readSrc(file)
    assert.ok(!/href=\{BUSINESS\.phoneHref\}/.test(src), `${file} still has raw phoneHref`)
    assert.ok(/PhoneLink|CallButton/.test(src), `${file} missing PhoneLink/CallButton`)
  }
  const phoneLink = readSrc('src/components/ui/Button.jsx')
  assert.ok(phoneLink.includes('trackPhoneClick'))
  assert.ok(phoneLink.includes('href={BUSINESS.phoneHref}'))
})

test('summary and email contain funnel section and clear lead labels', () => {
  const payload = {
    range: { label: 'Jul 13 – Jul 19, 2026', type: 'weekly' },
    uniqueVisitors: { available: true, value: 10 },
    pageViews: { available: true, value: 40 },
    totalLeads: { available: true, value: 0 },
    instantQuoteStarts: { available: true, value: 3 },
    instantQuoteCompletions: { available: true, value: 0 },
    instantQuoteCompletionRate: { available: true, value: 0 },
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
      instantQuoteCompletionRate: { available: true, direction: 'unchanged', displayDiff: '0', percentLabel: '0%' },
      phoneClicks: { available: true, direction: 'unchanged', displayDiff: '0', percentLabel: '0%' },
      contactFormSubmissions: { available: false },
      bookingRequests: { available: false },
      projectsPublished: { available: true, direction: 'unchanged', displayDiff: '0', percentLabel: '0%' },
      conversionRate: { available: true, direction: 'unchanged', displayDiff: '0', percentLabel: '0%' },
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
  assert.ok(email.html.includes('Quote funnel'))
  assert.ok(email.text.includes('QUOTE FUNNEL'))
  assert.ok(email.text.includes('not unique customers'))
  assert.ok(email.html.includes('not unique callers') || email.html.includes('not unique customers'))
  assert.ok(email.text.includes('KEY METRICS'))
  assert.ok(!/@gmail\.com/i.test(email.html))
  assert.ok(!/\b555[- ]?\d{3}/.test(email.html))
  assert.ok(!/\bJane Doe\b/i.test(email.html))
})

test('zero quote starts email shows n/a completion rate', () => {
  const payload = {
    range: { label: 'Jul 13 – Jul 19, 2026', type: 'weekly' },
    uniqueVisitors: { available: true, value: 5 },
    pageViews: { available: true, value: 10 },
    totalLeads: { available: true, value: 0 },
    instantQuoteStarts: { available: true, value: 0 },
    instantQuoteCompletions: { available: true, value: 0 },
    instantQuoteCompletionRate: { available: true, value: null },
    phoneClicks: { available: true, value: 0 },
    topPages: { available: true, value: [] },
    trafficSources: { available: true, value: [] },
    referringDomains: { available: true, value: [] },
    deviceTypes: { available: true, value: {} },
    leadsByService: { available: true, value: [] },
    leadsByCity: { available: true, value: [] },
    contactFormSubmissions: { available: true, value: 0 },
    bookingRequests: { available: true, value: 0 },
    projectsPublished: { available: true, value: 0 },
    conversionRate: { available: true, value: 0 },
    comparisons: {},
  }
  const email = buildReportEmail({
    type: 'weekly',
    payload,
    summaryLines: buildPlainLanguageSummary(payload, 'weekly'),
    adminUrl: 'https://www.mikesexteriorcleaning.com/admin/dashboard',
    businessName: "Mike's Exterior Cleaning Services",
  })
  assert.ok(email.html.includes('n/a (no quote starts)'))
  assert.ok(email.text.includes('n/a (no quote starts)'))
})

test('unused ptDate helper kept for clarity', () => {
  assert.ok(ptDate('2026-07-20T16:00:00.000Z') instanceof Date)
})

console.log(`\n${passed} tests completed`)
