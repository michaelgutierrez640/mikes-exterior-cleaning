import { submitLead } from './submitLead'
import { formatBookingMessage } from '../utils/bookingMessage'

const BOOKING_SUBJECT = 'New Booking Request from Website'

/**
 * Submit a booking request. When `linkedLeadId` is present (from Instant Quote),
 * the CRM updates that same lead instead of creating a duplicate.
 */
export async function submitBookingRequest(booking) {
  const serviceField = booking.services?.length ? booking.services.join(', ') : 'General exterior cleaning'

  const message = formatBookingMessage({
    preferredDate: booking.preferredDate,
    timeWindow: booking.timeWindow,
    customTime: booking.customTime,
    estimateRange: booking.estimateRange,
    services: booking.services,
    notes: booking.notes,
    quoteDetails: booking.quoteDetails,
  })

  let quotedAmount
  if (booking.quotedAmount != null && booking.quotedAmount !== '') {
    quotedAmount = booking.quotedAmount
  }

  return submitLead({
    name: booking.name,
    phone: booking.phone,
    email: booking.email,
    address: booking.address,
    service: serviceField,
    message,
    subject: BOOKING_SUBJECT,
    source: 'booking',
    companyWebsite: booking.companyWebsite || '',
    linkedLeadId: booking.linkedLeadId || undefined,
    preferredDate: booking.preferredDate,
    timeWindow: booking.timeWindow,
    customTime: booking.customTime,
    quotedAmount,
    smsConsent: booking.smsConsent === true,
    idempotencyKey: booking.idempotencyKey || undefined,
  })
}
