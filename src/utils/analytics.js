import {
  PIGEON_PATH,
  PIGEON_SERVICE,
  buildPigeonTrackingParams as buildPigeonTrackingParamsBase,
} from './pigeonTracking'

export {
  PIGEON_PATH,
  PIGEON_PROBLEM_TRACKING_KEYS,
  PIGEON_SERVICE,
  normalizeCityForTracking,
  normalizePigeonProblemsForTracking,
} from './pigeonTracking'

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || ''
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID?.trim() || ''
const INTERNAL_ENDPOINT = '/api/track-event'
const QUOTE_STARTED_SESSION_KEY = 'mikes_quote_started_session'
const PRODUCTION_HOSTS = new Set(['www.mikesexteriorcleaning.com', 'mikesexteriorcleaning.com'])

function isDebugEnabled() {
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('debug_analytics') === '1') return true
    return window.localStorage.getItem('mikes_analytics_debug') === '1'
  } catch {
    return false
  }
}

/**
 * Client-side mirror of lib/analyticsFilter.mjs host rules.
 * Preview = *.vercel.app (or localhost). Production canonical hosts are always allowed.
 */
export function isNonProductionAnalyticsHost(hostname = typeof window !== 'undefined' ? window.location.hostname : '') {
  const h = String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
  if (!h) return false
  if (PRODUCTION_HOSTS.has(h)) return false
  if (h.endsWith('.vercel.app')) return true
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) return true
  return false
}

export function isAdminAnalyticsPath(path) {
  if (!path) return false
  const p = String(path).split('?')[0]
  return p === '/admin' || p.startsWith('/admin/')
}

/** Whether first-party events should be sent to /api/track-event from this browser context. */
export function shouldSendInternalAnalytics(pathOverride) {
  if (typeof window === 'undefined') return false
  if (isNonProductionAnalyticsHost(window.location.hostname)) return false
  const path = pathOverride ?? window.location.pathname + window.location.search
  if (isAdminAnalyticsPath(path)) return false
  return true
}

function getOrCreateId(key) {
  if (typeof window === 'undefined') return null
  try {
    const existing = window.localStorage.getItem(key)
    if (existing) return existing
    const id = `${key.replace(/[^a-z]/gi, '').slice(0, 8)}_${cryptoRandom()}`
    window.localStorage.setItem(key, id)
    return id
  } catch {
    return null
  }
}

function cryptoRandom() {
  try {
    const arr = new Uint8Array(12)
    window.crypto.getRandomValues(arr)
    return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return Math.random().toString(16).slice(2)
  }
}

function getSessionId() {
  if (typeof window === 'undefined') return null
  const key = 'mikes_session_id'
  try {
    const existing = window.sessionStorage.getItem(key)
    if (existing) return existing
    const id = `sess_${cryptoRandom()}`
    window.sessionStorage.setItem(key, id)
    return id
  } catch {
    return null
  }
}

function getUtmParams() {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  return {
    utmSource: params.get('utm_source') || null,
    utmMedium: params.get('utm_medium') || null,
    utmCampaign: params.get('utm_campaign') || null,
    utmTerm: params.get('utm_term') || null,
    utmContent: params.get('utm_content') || null,
  }
}

function getFirstTouch() {
  if (typeof window === 'undefined') {
    return {
      referrer: null,
      landingPath: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
    }
  }
  const key = 'mikes_first_touch'
  try {
    const existing = window.localStorage.getItem(key)
    if (existing) {
      const parsed = JSON.parse(existing)
      return {
        referrer: parsed.referrer || null,
        landingPath: parsed.landingPath || null,
        utmSource: parsed.utmSource || null,
        utmMedium: parsed.utmMedium || null,
        utmCampaign: parsed.utmCampaign || null,
        utmTerm: parsed.utmTerm || null,
        utmContent: parsed.utmContent || null,
      }
    }
    const utm = getUtmParams()
    const first = {
      referrer: document.referrer || null,
      landingPath: window.location.pathname + window.location.search,
      ...utm,
    }
    window.localStorage.setItem(key, JSON.stringify(first))
    return first
  } catch {
    return {
      referrer: document.referrer || null,
      landingPath: window.location.pathname + window.location.search,
      ...getUtmParams(),
    }
  }
}

/**
 * Attribution snapshot for CRM lead ingest (first-touch UTMs when present).
 * Safe to call from form submit handlers — contains no customer PII.
 */
export function getLeadAttribution() {
  if (typeof window === 'undefined') {
    return {
      originalLandingPage: null,
      conversionPage: null,
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
    }
  }

  const first = getFirstTouch()
  const lastUtm = getUtmParams()

  return {
    originalLandingPage: first.landingPath || window.location.pathname + window.location.search,
    conversionPage: window.location.pathname + window.location.search,
    referrer: first.referrer || document.referrer || null,
    utmSource: first.utmSource || lastUtm.utmSource,
    utmMedium: first.utmMedium || lastUtm.utmMedium,
    utmCampaign: first.utmCampaign || lastUtm.utmCampaign,
    utmTerm: first.utmTerm || lastUtm.utmTerm,
    utmContent: first.utmContent || lastUtm.utmContent,
  }
}

function hasGtag() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

function hasFbq() {
  return typeof window !== 'undefined' && typeof window.fbq === 'function'
}

export function trackEvent(eventName, params = {}) {
  if (hasGtag() && GA_ID) {
    window.gtag('event', eventName, params)
  }

  if (hasFbq() && META_PIXEL_ID) {
    window.fbq('trackCustom', eventName, params)
  }
}

export function trackInternalEvent(type, props = {}) {
  if (typeof window === 'undefined') return

  const path = typeof props.path === 'string' ? props.path : window.location.pathname + window.location.search
  if (!shouldSendInternalAnalytics(path)) return

  const visitorId = getOrCreateId('mikes_visitor_id')
  const sessionId = getSessionId()
  const utm = getUtmParams()
  const firstTouch = getFirstTouch()
  const debug = isDebugEnabled()

  const payload = {
    type,
    visitorId,
    sessionId,
    pageTitle: document.title,
    referrer: firstTouch.referrer,
    ...utm,
    ...props,
    path,
    ...(debug ? { debug: true } : {}),
  }

  try {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    if (!debug && navigator.sendBeacon) {
      navigator.sendBeacon(INTERNAL_ENDPOINT, blob)
      return
    }
  } catch {
    // fall through to fetch
  }

  fetch(INTERNAL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  })
    .then(async (res) => {
      if (!debug) return
      const text = await res.text().catch(() => '')
      console.info('[Analytics debug] event', type, 'status', res.status, text ? `body=${text}` : '')
    })
    .catch((err) => {
      if (!debug) return
      console.info('[Analytics debug] event', type, 'failed', String(err?.message || err))
    })
}

export function trackPageView(path) {
  if (!shouldSendInternalAnalytics(path)) return

  if (hasGtag() && GA_ID) {
    window.gtag('config', GA_ID, { page_path: path })
  }

  if (hasFbq() && META_PIXEL_ID) {
    window.fbq('track', 'PageView')
  }

  trackInternalEvent('page_view', { path })
}

export function trackPhoneClick(sourceHint = 'phone_link') {
  trackInternalEvent('phone_clicked', { sourceHint: String(sourceHint || 'phone_link').slice(0, 100) })
}

/** Safe pigeon-guard landing trackers — never throw into form/CTA handlers. */
function safePigeonTrack(fn) {
  try {
    fn()
  } catch {
    // Tracking must never block lead submission or CTA clicks.
  }
}

/**
 * Non-sensitive pigeon conversion params for GA4 / Meta / first-party.
 * Never includes name, phone, email, street address, or notes.
 */
export function buildPigeonTrackingParams({ city, problems, sourceHint } = {}) {
  return buildPigeonTrackingParamsBase({
    city,
    problems,
    sourceHint,
    utm: getUtmParams(),
  })
}

function sessionFlagKey(name) {
  return `mikes_pg_${name}`
}

function hasSessionFlag(name) {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(sessionFlagKey(name)) === '1'
  } catch {
    return false
  }
}

function setSessionFlag(name) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(sessionFlagKey(name), '1')
  } catch {
    // ignore
  }
}

/** Retry briefly — GA/Meta scripts are deferred until idle after first paint. */
function whenAnalyticsReady(check, cb, { attempts = 40, intervalMs = 250 } = {}) {
  if (typeof window === 'undefined') return
  if (check()) {
    cb()
    return
  }
  let n = 0
  const timer = window.setInterval(() => {
    n += 1
    if (check()) {
      window.clearInterval(timer)
      cb()
      return
    }
    if (n >= attempts) window.clearInterval(timer)
  }, intervalMs)
}

function trackGaPigeonEvent(eventName, params) {
  if (!GA_ID || !hasGtag()) return false
  window.gtag('event', eventName, params)
  return true
}

function trackMetaStandardEvent(eventName, params) {
  if (!META_PIXEL_ID || !hasFbq()) return false
  window.fbq('track', eventName, params)
  return true
}

function trackPigeonInternal(type, params = {}, sourceHint = 'pigeon_guard_landing') {
  trackInternalEvent(type, {
    path: PIGEON_PATH,
    sourceHint,
    service: PIGEON_SERVICE,
    city: params.city || null,
    // First-party store already accepts utm* from getUtmParams via trackInternalEvent.
  })
}

export function trackPigeonGuardPageView() {
  safePigeonTrack(() => {
    const params = buildPigeonTrackingParams({ sourceHint: 'pigeon_guard_landing' })

    // First-party once per session (Production hosts only inside trackInternalEvent).
    if (!hasSessionFlag('internal_page_view')) {
      setSessionFlag('internal_page_view')
      trackPigeonInternal('pigeon_guard_page_view', params, 'pigeon_guard_landing')
    }

    whenAnalyticsReady(
      () => Boolean(GA_ID && hasGtag()),
      () => {
        if (hasSessionFlag('ga_page_view')) return
        if (trackGaPigeonEvent('pigeon_guard_page_view', params)) setSessionFlag('ga_page_view')
      },
    )

    // Meta: ViewContent on landing load (not Lead). Deduped for React remounts.
    whenAnalyticsReady(
      () => Boolean(META_PIXEL_ID && hasFbq()),
      () => {
        if (hasSessionFlag('meta_view_content')) return
        if (
          trackMetaStandardEvent('ViewContent', {
            content_name: 'Solar Panel Pigeon Guard',
            content_category: PIGEON_SERVICE,
            ...params,
          })
        ) {
          setSessionFlag('meta_view_content')
        }
      },
    )
  })
}

export function trackPigeonGuardEstimateClicked(sourceHint = 'pigeon_guard_estimate') {
  safePigeonTrack(() => {
    const params = buildPigeonTrackingParams({ sourceHint })
    whenAnalyticsReady(
      () => Boolean(GA_ID && hasGtag()),
      () => trackGaPigeonEvent('pigeon_guard_estimate_clicked', params),
    )
    trackPigeonInternal('pigeon_guard_estimate_clicked', params, sourceHint)
  })
}

export function trackPigeonGuardFormStarted() {
  safePigeonTrack(() => {
    if (hasSessionFlag('form_started')) return
    setSessionFlag('form_started')
    const params = buildPigeonTrackingParams({ sourceHint: 'pigeon_guard_form' })
    whenAnalyticsReady(
      () => Boolean(GA_ID && hasGtag()),
      () => trackGaPigeonEvent('pigeon_guard_form_started', params),
    )
    trackPigeonInternal('pigeon_guard_form_started', params, 'pigeon_guard_form')
  })
}

export function trackPigeonGuardPhotoAdded(count = 1) {
  safePigeonTrack(() => {
    // Photos are disabled in Production; keep as a no-op-safe hook if re-enabled later.
    const params = { ...buildPigeonTrackingParams({ sourceHint: 'pigeon_guard_form' }), photo_count: count }
    whenAnalyticsReady(
      () => Boolean(GA_ID && hasGtag()),
      () => trackGaPigeonEvent('pigeon_guard_photo_added', params),
    )
    trackPigeonInternal('pigeon_guard_photo_added', params, 'pigeon_guard_form')
  })
}

/**
 * Fire only after CRM lead API confirms creation (has lead id).
 * Meta Lead fires here only — never on CTA click or form_started.
 */
export function trackPigeonGuardFormSubmitted({ city, problems } = {}) {
  safePigeonTrack(() => {
    if (hasSessionFlag('form_submitted')) return
    setSessionFlag('form_submitted')
    const params = buildPigeonTrackingParams({
      city,
      problems,
      sourceHint: 'pigeon_guard_form',
    })

    whenAnalyticsReady(
      () => Boolean(GA_ID && hasGtag()),
      () => {
        trackGaPigeonEvent('pigeon_guard_form_submitted', params)
        // Compatibility with existing GA lead goals, if configured.
        trackGaPigeonEvent('generate_lead', { currency: 'USD', ...params })
      },
    )

    whenAnalyticsReady(
      () => Boolean(META_PIXEL_ID && hasFbq()),
      () => {
        trackMetaStandardEvent('Lead', {
          content_name: 'Pigeon Guard Estimate',
          content_category: PIGEON_SERVICE,
          ...params,
        })
      },
    )

    trackPigeonInternal('pigeon_guard_form_submitted', params, 'pigeon_guard_form')
    // Keep legacy first-party name for any existing dashboards/reports.
    trackPigeonInternal('pigeon_guard_lead_submitted', params, 'pigeon_guard_form')
  })
}

/** @deprecated Use trackPigeonGuardFormSubmitted */
export function trackPigeonGuardLeadSubmitted(opts) {
  trackPigeonGuardFormSubmitted(opts)
}

export function trackPigeonGuardFormFailed({ city, problems, reason } = {}) {
  safePigeonTrack(() => {
    const params = buildPigeonTrackingParams({
      city,
      problems,
      sourceHint: 'pigeon_guard_form',
    })
    const failReason = String(reason || 'unknown')
      .replace(/[^\w.\- :]/g, '')
      .slice(0, 80)
    if (failReason) params.fail_reason = failReason

    whenAnalyticsReady(
      () => Boolean(GA_ID && hasGtag()),
      () => trackGaPigeonEvent('pigeon_guard_form_failed', params),
    )
    trackPigeonInternal('pigeon_guard_form_failed', params, 'pigeon_guard_form')
    // Do not fire Meta Lead on failure.
  })
}

export function trackPigeonGuardCallClicked(sourceHint = 'pigeon_guard_call') {
  safePigeonTrack(() => {
    const params = buildPigeonTrackingParams({ sourceHint })
    whenAnalyticsReady(
      () => Boolean(GA_ID && hasGtag()),
      () => trackGaPigeonEvent('pigeon_guard_call_clicked', params),
    )
    whenAnalyticsReady(
      () => Boolean(META_PIXEL_ID && hasFbq()),
      () => {
        trackMetaStandardEvent('Contact', {
          content_name: 'Pigeon Guard Call',
          content_category: PIGEON_SERVICE,
          ...params,
        })
      },
    )
    trackPigeonInternal('pigeon_guard_call_clicked', params, sourceHint)
  })
}

/**
 * Count at most one Instant Quote start per browser session.
 * Call from the Instant Quote calculator mount only (not from CTA buttons).
 * @returns {boolean} true if a new start event was recorded
 */
export function trackQuoteStarted() {
  if (typeof window === 'undefined') return false
  try {
    if (window.sessionStorage.getItem(QUOTE_STARTED_SESSION_KEY) === '1') {
      return false
    }
    window.sessionStorage.setItem(QUOTE_STARTED_SESSION_KEY, '1')
  } catch {
    // If sessionStorage is unavailable, still emit once this call.
  }

  trackEvent('quote_started', { page: '/instant-quote' })
  trackInternalEvent('instant_quote_started', {
    path: '/instant-quote',
    sourceHint: 'quote_calculator',
  })
  return true
}

export function trackQuoteServiceSelected(serviceId, selected) {
  trackEvent('quote_service_selected', { service_id: serviceId, selected })
}

export function trackQuoteStepCompleted(step, selectedServices = []) {
  trackEvent('quote_step_completed', {
    step,
    service_count: selectedServices.length,
  })
}

export function trackQuoteEstimateViewed(totalLow, totalHigh) {
  trackEvent('quote_estimate_viewed', {
    value: totalLow,
    currency: 'USD',
    estimate_low: totalLow,
    estimate_high: totalHigh,
  })

  if (hasFbq() && META_PIXEL_ID) {
    window.fbq('track', 'ViewContent', {
      content_name: 'Instant Quote Estimate',
      value: totalLow,
      currency: 'USD',
    })
  }
}

/** Exactly one first-party completion event per successful Instant Quote submission. */
export function trackQuoteSubmitted({ totalLow, totalHigh, services }) {
  const serviceList = Array.isArray(services) ? services : []
  trackEvent('quote_submitted', {
    value: totalLow,
    currency: 'USD',
    estimate_low: totalLow,
    estimate_high: totalHigh,
    services: serviceList.join(', '),
  })

  trackInternalEvent('instant_quote_completed', {
    quoteValueLow: totalLow,
    quoteValueHigh: totalHigh,
    service: serviceList.join(', '),
    sourceHint: 'quote_contact_form',
  })

  if (hasFbq() && META_PIXEL_ID) {
    window.fbq('track', 'Lead', {
      content_name: 'Instant Quote',
      value: totalLow,
      currency: 'USD',
    })
  }

  if (hasGtag() && GA_ID) {
    window.gtag('event', 'generate_lead', {
      value: totalLow,
      currency: 'USD',
    })
  }
}
