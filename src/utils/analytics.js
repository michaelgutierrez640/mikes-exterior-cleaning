const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || ''
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID?.trim() || ''
const INTERNAL_ENDPOINT = '/api/track-event'

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
  if (typeof window === 'undefined') return { referrer: null, landingPath: null }
  const key = 'mikes_first_touch'
  try {
    const existing = window.localStorage.getItem(key)
    if (existing) return JSON.parse(existing)
    const first = {
      referrer: document.referrer || null,
      landingPath: window.location.pathname + window.location.search,
    }
    window.localStorage.setItem(key, JSON.stringify(first))
    return first
  } catch {
    return { referrer: document.referrer || null, landingPath: window.location.pathname + window.location.search }
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

  const payload = {
    type,
    visitorId,
    sessionId,
    path: window.location.pathname + window.location.search,
    pageTitle: document.title,
    referrer: firstTouch.referrer,
    ...utm,
    ...props,
  }

  try {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    if (navigator.sendBeacon) {
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
  }).catch(() => {})
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
