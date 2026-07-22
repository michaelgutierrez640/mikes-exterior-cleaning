/**
 * Pacific-timezone reporting periods for analytics email reports.
 * All calendar math uses America/Los_Angeles.
 */

export const REPORT_TZ = 'America/Los_Angeles'

/**
 * @param {Date} [now]
 * @returns {string} YYYY-MM-DD in Pacific Time
 */
export function pacificDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * @param {Date} [now]
 * @returns {number} 0=Sunday … 6=Saturday in Pacific Time
 */
export function pacificWeekday(now = new Date()) {
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TZ,
    weekday: 'short',
  }).format(now)
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[wd] ?? 0
}

/**
 * @param {Date} [now]
 * @returns {number} day of month 1–31 in Pacific Time
 */
export function pacificDayOfMonth(now = new Date()) {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: REPORT_TZ,
      day: 'numeric',
    }).format(now),
  )
}

/**
 * Offset of REPORT_TZ relative to UTC at a given instant (ms to add to UTC to get local wall).
 * Computed as: localWallAsUtc - instant.
 */
function tzOffsetMs(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - date.getTime()
}

/**
 * Convert a Pacific calendar date + local wall time to a UTC epoch ms.
 * @param {string} dateKey YYYY-MM-DD
 */
export function pacificLocalToUtcMs(dateKey, hour = 0, minute = 0, second = 0, ms = 0) {
  const [y, m, d] = dateKey.split('-').map(Number)
  let utc = Date.UTC(y, m - 1, d, hour, minute, second, ms)
  for (let i = 0; i < 4; i++) {
    const offset = tzOffsetMs(new Date(utc))
    utc = Date.UTC(y, m - 1, d, hour, minute, second, ms) - offset
  }
  return utc
}

/**
 * @param {string} dateKey YYYY-MM-DD
 * @param {'start'|'end'} edge
 */
export function pacificDayBoundMs(dateKey, edge = 'start') {
  if (edge === 'start') return pacificLocalToUtcMs(dateKey, 0, 0, 0, 0)
  // end of day = start of next day - 1ms
  const next = addDaysToDateKey(dateKey, 1)
  return pacificLocalToUtcMs(next, 0, 0, 0, 0) - 1
}

export function addDaysToDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number)
  // Use UTC noon of the calendar date as a stable anchor, shift days, read back in PT
  const anchor = Date.UTC(y, m - 1, d, 20, 0, 0) // ~noon–afternoon PT year-round
  const shifted = new Date(anchor + days * 24 * 60 * 60 * 1000)
  return pacificDateKey(shifted)
}

/**
 * Previous complete Mon–Sun week relative to `now` in Pacific Time.
 * On Monday, this is the week that ended yesterday (Sunday).
 */
export function getPreviousWeekRange(now = new Date()) {
  const today = pacificDateKey(now)
  const weekday = pacificWeekday(now) // 0 Sun … 1 Mon
  const daysSinceSunday = weekday === 0 ? 0 : weekday
  const endKey = addDaysToDateKey(today, -daysSinceSunday)
  const startKey = addDaysToDateKey(endKey, -6)
  return {
    type: 'weekly',
    startDate: startKey,
    endDate: endKey,
    periodKey: `weekly:${startKey}:${endKey}`,
    label: `${formatDisplayDate(startKey)} – ${formatDisplayDate(endKey)}`,
    startMs: pacificDayBoundMs(startKey, 'start'),
    endMs: pacificDayBoundMs(endKey, 'end'),
  }
}

/** Week immediately before the given weekly range. */
export function getPriorWeekRange(weekRange) {
  const endDate = addDaysToDateKey(weekRange.startDate, -1)
  const startDate = addDaysToDateKey(endDate, -6)
  return {
    type: 'weekly',
    startDate,
    endDate,
    periodKey: `weekly:${startDate}:${endDate}`,
    label: `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`,
    startMs: pacificDayBoundMs(startDate, 'start'),
    endMs: pacificDayBoundMs(endDate, 'end'),
  }
}

/**
 * Previous complete calendar month in Pacific Time.
 */
export function getPreviousMonthRange(now = new Date()) {
  const today = pacificDateKey(now)
  const [y, m] = today.split('-').map(Number)
  let py = y
  let pm = m - 1
  if (pm < 1) {
    pm = 12
    py -= 1
  }
  const startDate = `${py}-${String(pm).padStart(2, '0')}-01`
  const thisMonthStart = `${y}-${String(m).padStart(2, '0')}-01`
  const endDate = addDaysToDateKey(thisMonthStart, -1)
  const ym = `${py}-${String(pm).padStart(2, '0')}`
  return {
    type: 'monthly',
    startDate,
    endDate,
    periodKey: `monthly:${ym}`,
    label: formatMonthLabel(ym),
    yearMonth: ym,
    startMs: pacificDayBoundMs(startDate, 'start'),
    endMs: pacificDayBoundMs(endDate, 'end'),
  }
}

export function getPriorMonthRange(monthRange) {
  const [y, m] = monthRange.yearMonth.split('-').map(Number)
  let py = y
  let pm = m - 1
  if (pm < 1) {
    pm = 12
    py -= 1
  }
  const startDate = `${py}-${String(pm).padStart(2, '0')}-01`
  const endDate = addDaysToDateKey(monthRange.startDate, -1)
  const ym = `${py}-${String(pm).padStart(2, '0')}`
  return {
    type: 'monthly',
    startDate,
    endDate,
    periodKey: `monthly:${ym}`,
    label: formatMonthLabel(ym),
    yearMonth: ym,
    startMs: pacificDayBoundMs(startDate, 'start'),
    endMs: pacificDayBoundMs(endDate, 'end'),
  }
}

/**
 * What the daily cron should send today (Pacific).
 * @returns {{ weekly: object|null, monthly: object|null }}
 */
export function getDueReportPeriods(now = new Date()) {
  const weekday = pacificWeekday(now)
  const day = pacificDayOfMonth(now)
  return {
    weekly: weekday === 1 ? getPreviousWeekRange(now) : null,
    monthly: day === 1 ? getPreviousMonthRange(now) : null,
  }
}

export function nextWeeklySendDate(now = new Date()) {
  const today = pacificDateKey(now)
  const weekday = pacificWeekday(now)
  if (weekday === 1) return today
  const daysUntilMon = weekday === 0 ? 1 : 8 - weekday
  return addDaysToDateKey(today, daysUntilMon)
}

export function nextMonthlySendDate(now = new Date()) {
  const today = pacificDateKey(now)
  const day = pacificDayOfMonth(now)
  if (day === 1) return today
  const [y, m] = today.split('-').map(Number)
  let ny = y
  let nm = m + 1
  if (nm > 12) {
    nm = 1
    ny += 1
  }
  return `${ny}-${String(nm).padStart(2, '0')}-01`
}

export function formatDisplayDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1]} ${d}, ${y}`
}

export function formatMonthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  return `${months[m - 1]} ${y}`
}

export function eventTimestampMs(event) {
  if (!event) return null
  if (Number.isFinite(Number(event.ts))) return Number(event.ts)
  if (event.at) {
    const parsed = Date.parse(event.at)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

export function isInRange(ms, range) {
  return Number.isFinite(ms) && ms >= range.startMs && ms <= range.endMs
}
