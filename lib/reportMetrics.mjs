/**
 * Aggregate first-party analytics + CRM + published projects for a report period.
 * Does not invent values — marks unavailable when storage/data is missing.
 */
import { listEvents, isStorageReady } from './analyticsStore.mjs'
import { isAdminAnalyticsPath } from './analyticsFilter.mjs'
import { listLeads, isLeadsStorageConfigured } from './leadsStore.mjs'
import { listProjects, isProjectsStorageConfigured } from './projectsStore.mjs'
import { eventTimestampMs, isInRange } from './reportTime.mjs'
import { compareValues } from './reportCompare.mjs'

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)))
}

function pickDeviceType(ua = '') {
  const s = String(ua).toLowerCase()
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
  if (ref.includes('g.page') || ref.includes('google.com/maps') || ref.includes('maps.google.com')) {
    return 'Google Business Profile'
  }
  if (ref.includes('facebook.com') || ref.includes('instagram.com')) return 'Facebook/Instagram'
  if (!ref) return 'Direct'
  return 'Referral'
}

function referrerDomain(referrer) {
  const raw = String(referrer || '').trim()
  if (!raw) return null
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    return url.hostname.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

function topN(countMap, n = 5) {
  return Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }))
}

function countBy(items, getter) {
  const map = {}
  for (const item of items) {
    const key = getter(item)
    if (!key) continue
    map[key] = (map[key] || 0) + 1
  }
  return map
}

function filterEvents(events, range) {
  return events.filter((e) => {
    // Defense in depth: never count admin UI traffic even if older events slipped into Redis.
    if (isAdminAnalyticsPath(e.path)) return false
    const ms = eventTimestampMs(e)
    return isInRange(ms, range)
  })
}

function metric(value, available = true) {
  if (!available) {
    return { value: null, available: false, label: 'Unavailable' }
  }
  return { value, available: true, label: null }
}

/**
 * @param {object} range from reportTime
 * @param {{ events?: array, leads?: array, projects?: array }} [preloaded]
 */
export async function buildPeriodMetrics(range, preloaded = {}) {
  const analyticsReady = isStorageReady()
  const leadsReady = isLeadsStorageConfigured()
  const projectsReady = isProjectsStorageConfigured()

  let events = preloaded.events
  if (!events) {
    events = analyticsReady ? await listEvents() : []
  }
  const inRange = filterEvents(events, range)

  const pageViews = inRange.filter((e) => e.type === 'page_view')
  const uniqueVisitors = uniq(pageViews.map((e) => e.visitorId)).length

  const phoneClicks =
    inRange.filter((e) => e.type === 'phone_clicked').length +
    inRange.filter((e) => e.type === 'call_now_clicked').length

  const quoteStarts = inRange.filter((e) => e.type === 'instant_quote_started').length
  const quoteCompletions = inRange.filter((e) => e.type === 'instant_quote_completed').length
  const contactSubmissions = inRange.filter((e) => e.type === 'contact_form_submitted').length
  const bookingRequests = inRange.filter((e) => e.type === 'booking_requested').length

  const topPages = topN(countBy(pageViews, (e) => e.path || '/'), 8)
  const topSources = topN(
    countBy(pageViews, (e) =>
      normalizeSource({ utmSource: e.utmSource, utmMedium: e.utmMedium, referrer: e.referrer }),
    ),
    8,
  )
  const referringDomains = topN(
    countBy(
      pageViews.map((e) => referrerDomain(e.referrer)).filter(Boolean),
      (d) => d,
    ),
    8,
  )
  const deviceTypes = countBy(pageViews, (e) => pickDeviceType(e.userAgent))

  let leadsInRange = []
  if (leadsReady) {
    const allLeads = preloaded.leads || (await listLeads({ limit: 1000 }))
    leadsInRange = allLeads.filter((lead) => {
      const ms = Date.parse(lead.createdAt || '')
      return isInRange(ms, range)
    })
  }

  const leadsBySource = topN(countBy(leadsInRange, (l) => l.source || 'unknown'), 8)
  const leadsByService = topN(countBy(leadsInRange, (l) => l.service || 'unspecified'), 8)
  const leadsByCity = topN(countBy(leadsInRange, (l) => l.city || 'unspecified'), 8)

  let projectsPublished = null
  let projectsAvailable = false
  if (projectsReady) {
    projectsAvailable = true
    const published = preloaded.projects || (await listProjects('published'))
    projectsPublished = published.filter((p) => {
      const ms = Date.parse(p.publishedAt || p.updatedAt || '')
      return isInRange(ms, range)
    }).length
  }

  const totalLeads = leadsReady ? leadsInRange.length : null
  const conversionRate =
    analyticsReady && leadsReady && uniqueVisitors > 0 && totalLeads != null
      ? totalLeads / uniqueVisitors
      : analyticsReady && leadsReady
        ? 0
        : null

  // Completion rate only when there was at least one start (avoid 0/0 → invalid %).
  const quoteCompletionRate =
    analyticsReady && quoteStarts > 0 ? quoteCompletions / quoteStarts : null

  return {
    range: {
      type: range.type,
      startDate: range.startDate,
      endDate: range.endDate,
      periodKey: range.periodKey,
      label: range.label,
    },
    storage: {
      analytics: analyticsReady,
      leads: leadsReady,
      projects: projectsReady,
    },
    uniqueVisitors: metric(uniqueVisitors, analyticsReady),
    pageViews: metric(pageViews.length, analyticsReady),
    topPages: metric(topPages, analyticsReady),
    trafficSources: metric(topSources, analyticsReady),
    referringDomains: metric(referringDomains, analyticsReady),
    deviceTypes: metric(deviceTypes, analyticsReady),
    phoneClicks: metric(phoneClicks, analyticsReady),
    instantQuoteStarts: metric(quoteStarts, analyticsReady),
    instantQuoteCompletions: metric(quoteCompletions, analyticsReady),
    instantQuoteCompletionRate: metric(quoteCompletionRate, analyticsReady),
    contactFormSubmissions: metric(contactSubmissions, analyticsReady),
    bookingRequests: metric(bookingRequests, analyticsReady),
    totalLeads: metric(totalLeads, leadsReady),
    leadsBySource: metric(leadsBySource, leadsReady),
    leadsByService: metric(leadsByService, leadsReady),
    leadsByCity: metric(leadsByCity, leadsReady),
    conversionRate: metric(conversionRate, analyticsReady && leadsReady),
    projectsPublished: metric(projectsPublished, projectsAvailable),
  }
}

/**
 * Attach comparisons between current and previous period metrics.
 */
export function attachComparisons(current, previous) {
  const keys = [
    'uniqueVisitors',
    'pageViews',
    'phoneClicks',
    'instantQuoteStarts',
    'instantQuoteCompletions',
    'contactFormSubmissions',
    'bookingRequests',
    'totalLeads',
    'projectsPublished',
  ]

  const comparisons = {}
  for (const key of keys) {
    const cur = current[key]
    const prev = previous[key]
    if (!cur?.available || !prev?.available || cur.value == null || prev.value == null) {
      comparisons[key] = {
        available: false,
        label: 'Unavailable',
      }
      continue
    }
    comparisons[key] = {
      available: true,
      ...compareValues(cur.value, prev.value),
    }
  }

  if (current.conversionRate?.available && previous.conversionRate?.available) {
    const curPct = Math.round((Number(current.conversionRate.value) || 0) * 1000) / 10
    const prevPct = Math.round((Number(previous.conversionRate.value) || 0) * 1000) / 10
    comparisons.conversionRate = {
      available: true,
      ...compareValues(curPct, prevPct),
      unit: 'pp',
    }
  } else {
    comparisons.conversionRate = { available: false, label: 'Unavailable' }
  }

  if (
    current.instantQuoteCompletionRate?.available &&
    previous.instantQuoteCompletionRate?.available &&
    current.instantQuoteCompletionRate.value != null &&
    previous.instantQuoteCompletionRate.value != null
  ) {
    const curPct = Math.round(Number(current.instantQuoteCompletionRate.value) * 1000) / 10
    const prevPct = Math.round(Number(previous.instantQuoteCompletionRate.value) * 1000) / 10
    comparisons.instantQuoteCompletionRate = {
      available: true,
      ...compareValues(curPct, prevPct),
      unit: 'pp',
    }
  } else {
    comparisons.instantQuoteCompletionRate = { available: false, label: 'Unavailable' }
  }

  return { ...current, comparisons, previousRange: previous.range }
}

export async function buildReportPayload(range, priorRange) {
  const analyticsReady = isStorageReady()
  const leadsReady = isLeadsStorageConfigured()
  const projectsReady = isProjectsStorageConfigured()

  const [events, leads, projects] = await Promise.all([
    analyticsReady ? listEvents() : Promise.resolve([]),
    leadsReady ? listLeads({ limit: 1000 }) : Promise.resolve([]),
    projectsReady ? listProjects('published') : Promise.resolve([]),
  ])

  const preloaded = { events, leads, projects }
  const current = await buildPeriodMetrics(range, preloaded)
  const previous = await buildPeriodMetrics(priorRange, preloaded)
  return attachComparisons(current, previous)
}
