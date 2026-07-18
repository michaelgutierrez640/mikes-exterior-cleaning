export const BUSINESS = {
  name: "Mike's Exterior Cleaning Services",
  shortName: "Mike's Exterior",
  tagline: 'Cleaning Services',
  phone: '(209) 496-5519',
  phoneHref: 'tel:2094965519',
  email: 'mikesexteriorcleaning209@gmail.com',
  emailHref: 'mailto:mikesexteriorcleaning209@gmail.com',
  description:
    'Professional exterior cleaning company based in Modesto, CA. We deliver window cleaning, gutter cleaning, solar panel cleaning, and pressure washing for residential and commercial clients throughout the Central Valley — with meticulous care, competitive pricing, and a satisfaction guarantee.',
  /** Postal address for NAP and LocalBusiness schema. Set streetAddress when available. */
  address: {
    streetAddress: import.meta.env.VITE_BUSINESS_STREET_ADDRESS?.trim() || null,
    city: 'Modesto',
    state: 'CA',
    postalCode: '95350',
    country: 'US',
  },
  /** Shown in footer and contact blocks when no street address is configured. */
  serviceAreaLabel: 'Modesto, CA & the Central Valley',
  // Google Business Profile
  googleReviewRating: 5.0,
  googleReviews: 44,
  /** Public GBP / Google Maps listing URL for schema sameAs and footer link. Set in Vercel as VITE_GOOGLE_REVIEWS_URL. */
  googleReviewsUrl: import.meta.env.VITE_GOOGLE_REVIEWS_URL?.trim() || null,
  googlePlaceId: null,
  serviceAreas: [
    'Modesto',
    'Salida',
    'Riverbank',
    'Oakdale',
    'Ripon',
    'Turlock',
    'Ceres',
    'Manteca',
    'Tracy',
    'Stockton',
  ],
  region: 'Central Valley',
  hours: [
    { days: 'Monday – Friday', time: '7:00 AM – 6:00 PM' },
    { days: 'Saturday', time: '8:00 AM – 4:00 PM' },
    { days: 'Sunday', time: 'By Appointment' },
  ],
  social: {
    facebook: null,
    instagram: null,
    google: null,
  },
}

export function getGoogleReviewCountDisplay() {
  return BUSINESS.googleReviews ?? '[Your review count]'
}

export function getGoogleReviewRatingDisplay() {
  if (BUSINESS.googleReviewRating == null) return '[Your rating]'
  return Number(BUSINESS.googleReviewRating).toFixed(1)
}

export function getGoogleReviewsBadgeLabel() {
  const count = getGoogleReviewCountDisplay()
  const rating = getGoogleReviewRatingDisplay()
  if (BUSINESS.googleReviewRating != null) {
    return `${rating} Rating • ${count} Google Reviews`
  }
  return `${count} Google Reviews`
}

export function getGoogleReviewsLink() {
  return BUSINESS.googleReviewsUrl ?? null
}

/** Single-line NAP for visible footer/contact (street omitted when not configured). */
export function getBusinessNapLine() {
  const { streetAddress, city, state, postalCode } = BUSINESS.address
  if (streetAddress) {
    return `${streetAddress}, ${city}, ${state} ${postalCode}`
  }
  return `${city}, ${state} ${postalCode}`
}

export function getHeroTrustBadges() {
  return [
    { id: 'insured', label: 'Fully Insured' },
    { id: 'estimates', label: 'Free Estimates' },
    { id: 'equipment', label: 'Professional Equipment' },
  ]
}

export const HERO_TRUST_BADGES = getHeroTrustBadges()

export const HERO_STATS = [
  {
    end: BUSINESS.googleReviews,
    suffix: '',
    label: 'Google Reviews',
    placeholder: '[Your review count]',
  },
  { end: 500, suffix: '+', label: 'Happy Customers' },
  { end: 3000, suffix: '+', label: 'Windows Cleaned' },
  { end: 100, suffix: '%', label: 'Satisfaction' },
]

export const NAV_LINKS = [
  { label: 'Services', href: '/#services' },
  { label: 'Our Work', href: '/#gallery' },
  { label: 'Projects', href: '/projects' },
  { label: 'Results', href: '/#results' },
  { label: 'Reviews', href: '/#reviews' },
  { label: 'Service Areas', href: '/service-areas', shortLabel: 'Areas' },
  { label: 'Resources', href: '/resources' },
  { label: 'Instant Quote', href: '/instant-quote' },
  { label: 'Book Online', href: '/book-online' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Contact', href: '/#contact' },
]

/** Condensed header nav — CTAs (Instant Quote, Book Online) live as header buttons to avoid crowding the logo. */
export const HEADER_NAV_LINKS = [
  { label: 'Services', href: '/#services' },
  { label: 'Our Work', href: '/#gallery' },
  { label: 'Projects', href: '/projects' },
  { label: 'Reviews', href: '/#reviews' },
  { label: 'Service Areas', href: '/service-areas', shortLabel: 'Areas' },
  { label: 'Resources', href: '/resources' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Contact', href: '/#contact' },
]

export const MAP = {
  embedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d205462.24!2d-121.002!3d37.639!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80904683998f7a03%3A0x892821cdab81a551!2sModesto%2C%20CA!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus',
  title: "Mike's Exterior Cleaning Services service area — Modesto, CA",
}
