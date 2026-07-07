const STORAGE_KEY = 'mikes-booking-prefill'

export function buildBookingPrefill({
  name = '',
  phone = '',
  email = '',
  address = '',
  services = [],
  estimateRange = '',
  quoteDetails = '',
  serviceSlug = '',
} = {}) {
  return {
    name,
    phone,
    email,
    address,
    services: Array.isArray(services) ? services : [],
    estimateRange,
    quoteDetails,
    serviceSlug,
    fromQuote: Boolean(estimateRange || quoteDetails),
  }
}

export function saveBookingPrefill(prefill) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefill))
  } catch {
    // sessionStorage unavailable
  }
}

export function loadBookingPrefill() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearBookingPrefill() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function mergeBookingPrefill(locationState, stored) {
  if (locationState && Object.keys(locationState).length) return locationState
  return stored
}
