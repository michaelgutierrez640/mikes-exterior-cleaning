import { QUOTE_SERVICES } from './quoteServices'

/** Appointment request mode — Mike approves before booking is confirmed. */
export const BOOKING_MODE = 'request'

export const BOOKING_CONFIRMATION_MESSAGE =
  'Your appointment request has been received. Mike will confirm availability shortly.'

export const TIME_WINDOWS = [
  { id: 'morning', label: 'Morning', time: '8:00 AM – 12:00 PM' },
  { id: 'afternoon', label: 'Afternoon', time: '12:00 PM – 4:00 PM' },
  { id: 'evening', label: 'Evening', time: '4:00 PM – 7:00 PM' },
  { id: 'custom', label: 'Custom time request', time: null },
]

export const BOOKABLE_SERVICES = [
  ...QUOTE_SERVICES,
  {
    id: 'residential-window-cleaning',
    name: 'Residential Window Cleaning',
    shortDescription: 'Interior & exterior glass for homes — tracks, screens, and sills',
    icon: 'windows',
  },
]

export function getTimeWindowById(id) {
  return TIME_WINDOWS.find((w) => w.id === id)
}

export function formatTimeWindowLabel(windowId, customTime = '') {
  const window = getTimeWindowById(windowId)
  if (!window) return ''
  if (window.id === 'custom') return customTime.trim() ? `Custom: ${customTime.trim()}` : 'Custom time request'
  return `${window.label} (${window.time})`
}

export function getMinBookingDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export function getMaxBookingDate() {
  const d = new Date()
  d.setMonth(d.getMonth() + 3)
  return d.toISOString().split('T')[0]
}
