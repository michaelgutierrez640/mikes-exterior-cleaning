import crypto from 'crypto'
import {
  EVENTS_KEY,
  MAX_EVENTS,
  VISITORS_ALL_KEY,
  getAnalyticsRedis,
  isAnalyticsStorageConfigured,
  visitorsDayKey,
} from './analyticsRedis.mjs'

export function nowIso() {
  return new Date().toISOString()
}

export function getDayKey(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10)
}

export function safeId(prefix = 'evt') {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`
}

export function isStorageReady() {
  return isAnalyticsStorageConfigured()
}

function parseEvent(raw) {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return raw
}

/**
 * @param {object} event
 */
export async function addEvent(event) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    throw new Error('Analytics storage not configured (Upstash Redis / Vercel KV env vars missing)')
  }

  await redis.lpush(EVENTS_KEY, JSON.stringify(event))
  await redis.ltrim(EVENTS_KEY, 0, MAX_EVENTS - 1)

  if (event.type === 'page_view' && event.visitorId) {
    await redis.sadd(VISITORS_ALL_KEY, event.visitorId)
    const dayKey = visitorsDayKey(event.ts)
    await redis.sadd(dayKey, event.visitorId)
    await redis.expire(dayKey, 60 * 60 * 24 * 120)
  }
}

export async function listEvents() {
  const redis = getAnalyticsRedis()
  if (!redis) return []

  const raw = await redis.lrange(EVENTS_KEY, 0, -1)
  if (!Array.isArray(raw)) return []

  return raw
    .map(parseEvent)
    .filter(Boolean)
    .reverse()
}

export async function getRecentEvents(limit = 50) {
  const all = await listEvents()
  return all.slice(-limit).reverse()
}

export async function getStorageStats() {
  const redis = getAnalyticsRedis()
  if (!redis) {
    return {
      configured: false,
      eventCount: 0,
      visitorsTotal: 0,
      visitorsToday: 0,
    }
  }

  const [eventCount, visitorsTotal, visitorsToday] = await Promise.all([
    redis.llen(EVENTS_KEY),
    redis.scard(VISITORS_ALL_KEY),
    redis.scard(visitorsDayKey()),
  ])

  return {
    configured: true,
    eventCount: Number(eventCount) || 0,
    visitorsTotal: Number(visitorsTotal) || 0,
    visitorsToday: Number(visitorsToday) || 0,
  }
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

export async function computeDashboardMetrics() {
  const all = await listEvents()

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

  const storage = await getStorageStats()

  return {
    generatedAt: nowIso(),
    storage: {
      backend: storage.configured ? 'upstash-redis' : 'not_configured',
      eventCount: storage.eventCount,
    },
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
      recentQuotes: (await getRecentEvents(10)).filter((e) => e.type === 'instant_quote_completed').slice(0, 10),
      recentBookings: (await getRecentEvents(10)).filter((e) => e.type === 'booking_requested').slice(0, 10),
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

export function maskEventForDebug(event) {
  if (!event) return null
  return {
    id: event.id,
    type: event.type,
    at: event.at,
    path: event.path,
    visitorTail: event.visitorId ? String(event.visitorId).slice(-6) : null,
    sourceHint: event.sourceHint || null,
  }
}
