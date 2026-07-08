import crypto from 'crypto'

/**
 * In-memory analytics store (mock/local-first).
 *
 * NOTE: Vercel serverless instances do not guarantee persistence.
 * This store is intentionally shaped like a future DB layer.
 */

const MAX_EVENTS = 5000

/** @type {Array<object>} */
const events = []

export function nowIso() {
  return new Date().toISOString()
}

export function getDayKey(ts = Date.now()) {
  const d = new Date(ts)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

export function safeId(prefix = 'evt') {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`
}

/**
 * @param {object} event
 */
export function addEvent(event) {
  events.push(event)
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS)
  }
}

export function listEvents() {
  return events.slice()
}

export function getRecentEvents(limit = 50) {
  return events.slice(-limit).reverse()
}

function withinMs(ts, ms) {
  return Date.now() - ts <= ms
}

function getWindowMs(kind) {
  if (kind === 'today') return 24 * 60 * 60 * 1000
  if (kind === 'week') return 7 * 24 * 60 * 60 * 1000
  if (kind === 'month') return 30 * 24 * 60 * 60 * 1000
  return 365 * 24 * 60 * 60 * 1000
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)))
}

function pickDeviceType(ua = '') {
  const s = ua.toLowerCase()
  if (/(ipad|tablet)/.test(s)) return 'tablet'
  if (/(mobi|iphone|android)/.test(s)) return 'mobile'
  return 'desktop'
}

function normalizeSource({ utmSource, utmMedium, referrer }) {
  const src = String(utmSource || '').toLowerCase()
  const med = String(utmMedium || '').toLowerCase()
  const ref = String(referrer || '').toLowerCase()

  if (src.includes('google') && med.includes('cpc')) return 'Paid ads'
  if (src.includes('google') && (med.includes('organic') || !med)) return 'Google organic'
  if (src.includes('facebook') || src.includes('instagram')) return 'Facebook/Instagram'

  if (ref.includes('google.com') || ref.includes('bing.com') || ref.includes('duckduckgo.com')) return 'Google organic'
  if (ref.includes('g.page') || ref.includes('google.com/maps') || ref.includes('maps.google.com')) return 'Google Business Profile'
  if (ref.includes('facebook.com') || ref.includes('instagram.com')) return 'Facebook/Instagram'
  if (!ref) return 'Direct'
  return 'Referral'
}

function topN(countMap, n = 5) {
  return Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }))
}

export function computeDashboardMetrics() {
  const all = listEvents()

  const pageViews = all.filter((e) => e.type === 'page_view')
  const visitors = uniq(pageViews.map((e) => e.visitorId))
  const windowVisitors = (kind) =>
    uniq(pageViews.filter((e) => withinMs(e.ts, getWindowMs(kind))).map((e) => e.visitorId))
  const windowPageViews = (kind) => pageViews.filter((e) => withinMs(e.ts, getWindowMs(kind))).length

  const countBy = (items, getter) => {
    const map = {}
    for (const item of items) {
      const key = getter(item)
      if (!key) continue
      map[key] = (map[key] || 0) + 1
    }
    return map
  }

  const topPages = topN(countBy(pageViews, (e) => e.path), 7)
  const topSources = topN(
    countBy(pageViews, (e) => normalizeSource({ utmSource: e.utmSource, utmMedium: e.utmMedium, referrer: e.referrer })),
    7,
  )

  const deviceCounts = countBy(pageViews, (e) => pickDeviceType(e.userAgent))

  const leads = {
    instant_quote_started: all.filter((e) => e.type === 'instant_quote_started').length,
    instant_quote_completed: all.filter((e) => e.type === 'instant_quote_completed').length,
    booking_requested: all.filter((e) => e.type === 'booking_requested').length,
    contact_form_submitted: all.filter((e) => e.type === 'contact_form_submitted').length,
    phone_clicked: all.filter((e) => e.type === 'phone_clicked').length,
    call_now_clicked: all.filter((e) => e.type === 'call_now_clicked').length,
    text_clicked: all.filter((e) => e.type === 'text_clicked').length,
    book_online_clicked: all.filter((e) => e.type === 'book_online_clicked').length,
    google_review_clicked: all.filter((e) => e.type === 'google_review_clicked').length,
  }

  const quoteCompletions = all.filter((e) => e.type === 'instant_quote_completed')
  const totalQuoteValue = quoteCompletions.reduce((sum, e) => sum + (Number(e.quoteValueLow) || 0), 0)
  const avgQuoteValue = quoteCompletions.length ? totalQuoteValue / quoteCompletions.length : 0

  const mostRequestedService = topN(countBy(all.filter((e) => e.service), (e) => e.service), 1)[0] ?? null
  const mostRequestedCity = topN(countBy(all.filter((e) => e.city), (e) => e.city), 1)[0] ?? null

  const totalVisitors = visitors.length
  const quoteStartRate = totalVisitors ? leads.instant_quote_started / totalVisitors : 0
  const quoteCompletionRate = leads.instant_quote_started ? leads.instant_quote_completed / leads.instant_quote_started : 0
  const quoteToBookingRate = leads.instant_quote_completed ? leads.booking_requested / leads.instant_quote_completed : 0
  const overallLeadConversionRate = totalVisitors
    ? (leads.booking_requested + leads.contact_form_submitted + leads.instant_quote_completed) / totalVisitors
    : 0

  return {
    generatedAt: nowIso(),
    traffic: {
      totalVisitors,
      visitorsToday: windowVisitors('today').length,
      visitorsWeek: windowVisitors('week').length,
      visitorsMonth: windowVisitors('month').length,
      pageViewsTotal: pageViews.length,
      pageViewsToday: windowPageViews('today'),
      pageViewsWeek: windowPageViews('week'),
      pageViewsMonth: windowPageViews('month'),
      topSources,
      topPages,
      deviceCounts,
    },
    leads,
    conversions: {
      quoteStartRate,
      quoteCompletionRate,
      quoteToBookingRate,
      overallLeadConversionRate,
    },
    business: {
      totalQuoteValue,
      avgQuoteValue,
      mostRequestedService,
      mostRequestedCity,
      recentQuotes: getRecentEvents(10).filter((e) => e.type === 'instant_quote_completed').slice(0, 10),
      recentBookings: getRecentEvents(10).filter((e) => e.type === 'booking_requested').slice(0, 10),
    },
    attribution: {
      topLeadSources: topN(
        countBy(
          all.filter((e) => ['instant_quote_completed', 'booking_requested', 'contact_form_submitted'].includes(e.type)),
          (e) => normalizeSource({ utmSource: e.utmSource, utmMedium: e.utmMedium, referrer: e.referrer }),
        ),
        7,
      ),
    },
  }
}

