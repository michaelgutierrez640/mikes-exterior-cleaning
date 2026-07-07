import { submitLead } from './submitLead'
import { formatBookingMessage } from '../utils/bookingMessage'

const BOOKING_SUBJECT = 'New Booking Request from Website'

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

  return submitLead({
    name: booking.name,
    phone: booking.phone,
    email: booking.email,
    address: booking.address,
    service: serviceField,
    message,
    subject: BOOKING_SUBJECT,
  })
}
