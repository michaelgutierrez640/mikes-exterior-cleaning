const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID

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

export function trackPageView(path) {
  if (hasGtag() && GA_ID) {
    window.gtag('config', GA_ID, { page_path: path })
  }

  if (hasFbq() && META_PIXEL_ID) {
    window.fbq('track', 'PageView')
  }
}

export function trackQuoteStarted() {
  trackEvent('quote_started', { page: '/instant-quote' })
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
