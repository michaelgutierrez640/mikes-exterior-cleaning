export default function BookingConfirmation() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-royal-100 text-royal-600">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      </div>

      <h2 className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
        Appointment request received
      </h2>
      <p className="mx-auto mt-4 max-w-md text-[0.9375rem] leading-relaxed text-gray-500">
        Your appointment request has been received. Mike will confirm availability shortly.
      </p>

      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-royal-100 bg-royal-50/50 px-5 py-4">
        <p className="text-[0.8125rem] font-medium text-royal-800">What happens next?</p>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-gray-600">
          Mike will review your preferred date and time, then reach out to confirm or suggest alternatives.
          This is a request — your appointment is not confirmed until you hear back.
        </p>
      </div>
    </div>
  )
}
