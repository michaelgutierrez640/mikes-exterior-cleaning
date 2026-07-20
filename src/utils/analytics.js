const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || ''
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID?.trim() || ''
const INTERNAL_ENDPOINT = '/api/track-event'

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

  const visitorId = getOrCreateId('mikes_visitor_id')
  const sessionId = getSessionId()
  const utm = getUtmParams()
  const firstTouch = getFirstTouch()
  const debug = isDebugEnabled()

  const payload = {
    type,
    visitorId,
    sessionId,
    path: window.location.pathname + window.location.search,
    pageTitle: document.title,
    referrer: firstTouch.referrer,
    ...utm,
    ...props,
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
  if (hasGtag() && GA_ID) {
    window.gtag('config', GA_ID, { page_path: path })
  }

  if (hasFbq() && META_PIXEL_ID) {
    window.fbq('track', 'PageView')
  }

  trackInternalEvent('page_view', { path })
}

export function trackQuoteStarted() {
  trackEvent('quote_started', { page: '/instant-quote' })
  trackInternalEvent('instant_quote_started', { page: '/instant-quote' })
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

export function trackQuoteSubmitted({ totalLow, totalHigh, services }) {
  trackEvent('quote_submitted', {
    value: totalLow,
    currency: 'USD',
    estimate_low: totalLow,
    estimate_high: totalHigh,
    services: services.join(', '),
  })

  trackInternalEvent('instant_quote_completed', {
    quoteValueLow: totalLow,
    quoteValueHigh: totalHigh,
    service: services.join(', '),
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
