# Online Booking System — Build Report

**Built:** July 2026  
**Mode:** Request-only (Mike approves before appointment is confirmed)

---

## What was built

### 1. Booking flow after Instant Quote

- After a customer completes the Instant Quote Calculator, the confirmation screen now shows **Schedule Appointment**
- Clicking it navigates to `/book-online` with pre-filled:
  - Name, phone, email, address
  - Selected services
  - Quote estimate range
  - Full instant quote details (in submission message)

### 2. Dedicated `/book-online` page

- Standalone booking — no quote calculator required
- Mobile-first form matching site design
- Smooth scroll-reveal hero, card layout, validation

### 3. Booking form fields

| Field | Required |
|-------|----------|
| Name | Yes |
| Phone | Yes |
| Email | Yes |
| Service address | Yes |
| Selected services (multi-select) | Yes |
| Preferred date | Yes |
| Preferred time window | Yes |
| Quote estimate range | Shown when pre-filled from quote |
| Notes / special instructions | Optional |

### 4. Time windows

- **Morning:** 8:00 AM – 12:00 PM
- **Afternoon:** 12:00 PM – 4:00 PM
- **Evening:** 4:00 PM – 7:00 PM
- **Custom time request** — free-text field

### 5. Submission behavior

- Uses existing **FormSubmit.co** lead pipeline via `submitLead()`
- Wrapper: `submitBookingRequest()` in `src/services/submitBooking.js`
- Email subject: **"New Booking Request from Website"**
- Message includes date, time, services, estimate, quote details, notes
- Confirmation copy: *"Your appointment request has been received. Mike will confirm availability shortly."*

### 6. Calendar integration prep

- `src/services/calendarService.js` — placeholders for Google Calendar
- `docs/GOOGLE_CALENDAR.md` — env vars and setup steps
- `.env.example` — commented Google Calendar variables
- **No real API credentials required** — all windows shown as available

### 7. Website CTAs added

- **Navigation:** "Book Online" in `NAV_LINKS`
- **Homepage hero:** Book Online button
- **Instant Quote confirmation:** Schedule Appointment
- **Service pages:** Book Online in `ServiceCta` + bottom CTA (with service pre-select)
- **City / location pages:** Book Online in hero + footer CTAs
- **Window cleaning city pages:** Same pattern

### 8. SEO

- `getBookOnlinePageSeo()` — title + meta description
- `getBookOnlinePageSchemas()` — LocalBusiness `ReserveAction` + WebPage schema
- `/book-online` added to `scripts/generate-sitemap.mjs`

---

## How booking requests are submitted

```
Customer fills form
  → submitBookingRequest()
    → formatBookingMessage() (structured body)
      → submitLead() → POST https://formsubmit.co/ajax/mikesexteriorcleaning209@gmail.com
        → Email to Mike with subject "New Booking Request from Website"
```

Same FormSubmit.co account as contact form and instant quote.

---

## What is live

**Local build only** until you deploy. After `git push` + Vercel deploy:

| URL | Status |
|-----|--------|
| `/book-online` | New booking page |
| `/instant-quote` | Unchanged flow + new Schedule CTA on confirmation |
| Nav "Book Online" | New link |
| Sitemap | 44 URLs (includes `/book-online`) |

**Not live yet:**

- Google Calendar real-time availability
- Automatic calendar event creation
- GA4 booking events (can add `trackBookingSubmitted` later)

---

## Next step: Google Calendar syncing

1. Read `docs/GOOGLE_CALENDAR.md`
2. Create Google Cloud service account + share calendar
3. Add Vercel API route `/api/calendar/availability`
4. Set `VITE_GOOGLE_CALENDAR_ENABLED=true` and redeploy
5. Keep **request-only** until you want auto-confirm; use `createCalendarEvent()` only after manual approval

---

## Key files

```
src/config/booking.js
src/services/calendarService.js
src/services/submitBooking.js
src/utils/bookingMessage.js
src/utils/bookingPrefill.js
src/components/booking/BookingForm.jsx
src/components/booking/TimeWindowPicker.jsx
src/components/booking/BookingConfirmation.jsx
src/pages/BookOnlinePage.jsx
src/components/quote/QuoteConfirmation.jsx
docs/GOOGLE_CALENDAR.md
```

---

## Verify locally

```bash
npm run build
npm run preview
```

Visit `/book-online` and complete Instant Quote → Schedule Appointment flow.
