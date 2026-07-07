import { formatTimeWindowLabel } from '../config/booking'

export function formatBookingMessage({
  preferredDate,
  timeWindow,
  customTime,
  estimateRange,
  services,
  notes,
  quoteDetails,
}) {
  const lines = [
    '--- New Booking Request (Website) ---',
    '',
    `Preferred Date: ${preferredDate || 'Not specified'}`,
    `Preferred Time: ${formatTimeWindowLabel(timeWindow, customTime) || 'Not specified'}`,
    '',
    'Selected Services:',
    ...(services?.length ? services.map((s) => `• ${s}`) : ['• Not specified']),
    '',
  ]

  if (estimateRange) {
    lines.push(`Quote Estimate Range: ${estimateRange}`, '')
  }

  if (quoteDetails) {
    lines.push('--- Instant Quote Details ---', quoteDetails, '')
  }

  if (notes?.trim()) {
    lines.push('Notes / Special Instructions:', notes.trim(), '')
  }

  lines.push('Status: Pending approval — customer requested appointment; not yet confirmed on calendar.')

  return lines.join('\n')
}
