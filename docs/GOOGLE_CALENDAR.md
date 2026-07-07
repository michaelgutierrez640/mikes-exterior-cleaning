# Google Calendar Integration (Future)

The website booking system runs in **request-only mode** today. Customers submit appointment requests via FormSubmit.co; Mike approves manually before any job is confirmed.

This document describes how to connect live Google Calendar availability and optional auto-scheduling later.

## Current behavior

- `/book-online` — standalone booking form
- Instant Quote confirmation — "Schedule Appointment" pre-fills contact + quote data
- Submissions use `submitBookingRequest()` → FormSubmit.co with subject **"New Booking Request from Website"**
- `src/services/calendarService.js` returns all time windows as available (no API calls)

## Environment variables

Add these when you are ready to implement server-side calendar sync.

### Client (Vite — embedded at build time)

| Variable | Example | Purpose |
|----------|---------|---------|
| `VITE_GOOGLE_CALENDAR_ENABLED` | `true` | Feature flag to call availability API |

### Server (Vercel / API route — **never expose in client**)

| Variable | Example | Purpose |
|----------|---------|---------|
| `GOOGLE_CALENDAR_ID` | `primary` or `mikes@group.calendar.google.com` | Calendar to read/write |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `booking-bot@project.iam.gserviceaccount.com` | Service account identity |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | PEM key (use `\n` escapes in Vercel) |

Optional for OAuth (if using user calendar instead of service account):

| Variable | Purpose |
|----------|---------|
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth client |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth secret |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Long-lived refresh token |

## Recommended architecture

1. **Create a Vercel serverless function** (e.g. `/api/calendar/availability`) that:
   - Accepts `{ date: "YYYY-MM-DD" }`
   - Uses Google Calendar API `freeBusy.query` or `events.list`
   - Returns busy intervals for that day

2. **Update `calendarService.js`** `getCalendarAvailability()` to `fetch('/api/calendar/availability', ...)`.

3. **Keep request-only booking** until you trust auto-confirm logic. Even with calendar sync, continue using FormSubmit for the initial request email.

4. **Optional: `createCalendarEvent()`** — only call after Mike approves (admin action or email link), creating a tentative event with `status: tentative`.

## Google Cloud setup checklist

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Calendar API**
3. Create a **service account** and download JSON key
4. Share your Google Calendar with the service account email (Make changes to events)
5. Store credentials in Vercel environment variables (Production + Preview)
6. Implement `/api/calendar/availability` and test with `VITE_GOOGLE_CALENDAR_ENABLED=true`
7. Redeploy the site after setting client env vars

## Files involved

| File | Role |
|------|------|
| `src/services/calendarService.js` | Availability stubs + future API hooks |
| `src/services/submitBooking.js` | FormSubmit booking submission |
| `src/config/booking.js` | Time windows, date limits, request mode |
| `src/components/booking/BookingForm.jsx` | Customer-facing form |

## Safety notes

- Do **not** auto-create confirmed calendar events from public form submissions without review
- Rate-limit availability API to prevent abuse
- Never ship service account private keys in the Vite client bundle
- Validate dates server-side (same min/max rules as `getMinBookingDate()` / `getMaxBookingDate()`)
