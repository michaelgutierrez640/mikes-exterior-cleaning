/**
 * Safe period-over-period comparisons for analytics reports.
 */

/**
 * @param {number} current
 * @param {number} previous
 */
export function compareValues(current, previous) {
  const cur = Number(current) || 0
  const prev = Number(previous) || 0
  const diff = cur - prev

  let direction = 'unchanged'
  if (diff > 0) direction = 'increased'
  else if (diff < 0) direction = 'decreased'

  let percentChange = null
  let percentLabel = 'n/a'

  if (prev === 0) {
    if (cur === 0) {
      percentChange = 0
      percentLabel = '0%'
    } else {
      // Avoid infinite % when prior period had zero
      percentChange = null
      percentLabel = 'n/a (no prior baseline)'
    }
  } else {
    percentChange = Math.round(((diff / prev) * 1000)) / 10
    percentLabel = `${percentChange > 0 ? '+' : ''}${percentChange}%`
  }

  return {
    current: cur,
    previous: prev,
    diff,
    direction,
    percentChange,
    percentLabel,
    displayDiff: `${diff > 0 ? '+' : ''}${diff}`,
  }
}

export function directionArrow(direction) {
  if (direction === 'increased') return '▲'
  if (direction === 'decreased') return '▼'
  return '●'
}
