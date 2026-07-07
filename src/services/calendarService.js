/**
 * Calendar service — request-only mode today; Google Calendar sync is prepared for later.
 *
 * Future environment variables (see docs/GOOGLE_CALENDAR.md):
 *   VITE_GOOGLE_CALENDAR_ENABLED=true
 *   GOOGLE_CALENDAR_ID=primary
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL=...
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=... (server-side only)
 *
 * Client-side availability checks will call a server endpoint once credentials exist.
 */

import { TIME_WINDOWS } from '../config/booking'

const GOOGLE_CALENDAR_ENABLED =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_GOOGLE_CALENDAR_ENABLED === 'true'

/**
 * Whether live Google Calendar integration is configured.
 * Returns false until credentials and a backend proxy are added.
 */
export function isCalendarIntegrationEnabled() {
  return GOOGLE_CALENDAR_ENABLED
}

/**
 * Placeholder: fetch busy slots from Google Calendar for a given date.
 * @param {string} dateISO - YYYY-MM-DD
 * @returns {Promise<{ available: boolean, busySlots: Array<{ start: string, end: string }> }>}
 */
export async function getCalendarAvailability(dateISO) {
  if (!isCalendarIntegrationEnabled()) {
    return {
      available: true,
      busySlots: [],
      source: 'request-only',
      message: 'Calendar sync not enabled — all time windows shown for request.',
    }
  }

  // Future: POST /api/calendar/availability { date: dateISO }
  // const res = await fetch('/api/calendar/availability', { method: 'POST', body: JSON.stringify({ date: dateISO }) })
  // return res.json()

  throw new Error('Google Calendar integration is flagged but not yet implemented.')
}

/**
 * Placeholder: create a tentative calendar hold after Mike approves a request.
 * Not called during website submission — request-only mode.
 */
export async function createCalendarEvent(_booking) {
  if (!isCalendarIntegrationEnabled()) {
    return { success: false, reason: 'calendar_not_configured' }
  }

  // Future: server-side Google Calendar API event creation
  return { success: false, reason: 'not_implemented' }
}

/**
 * Returns time windows to display. When calendar is connected, filter by availability.
 */
export async function getAvailableTimeWindows(dateISO) {
  const availability = await getCalendarAvailability(dateISO)

  if (!availability.available && availability.busySlots?.length) {
    // Future: mark individual windows unavailable based on busySlots
    return TIME_WINDOWS
  }

  return TIME_WINDOWS
}
