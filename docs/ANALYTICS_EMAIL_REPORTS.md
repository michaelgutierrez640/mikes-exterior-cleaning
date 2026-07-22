# Analytics email reports (Phase 1)

Private weekly and monthly website-performance emails for Mike, powered by first-party analytics + CRM data already stored in Upstash Redis.

**Admin UI:** `/admin/reports` (password-protected)  
**Cron:** `GET/POST /api/cron/analytics-reports` once daily

---

## What is excluded from Production analytics

First-party events are gated in both the browser (`src/utils/analytics.js`) and the ingest API (`api/track-event.js` via `lib/analyticsFilter.mjs`). Skipped events return `{ ok: true, persisted: false, skipped: "<reason>" }` and are **not** written to Production Redis.

### Preview / non-Production hosts

Identified by request `Host` / `X-Forwarded-Host` (normalized, lowercased, port stripped):

| Host pattern | Result |
|---|---|
| `www.mikesexteriorcleaning.com` or `mikesexteriorcleaning.com` | **Allowed** (Production) |
| Ends with `.vercel.app` | **Excluded** (`skipped: non_production_host`) — Vercel Preview and deployment URLs |
| `localhost`, `127.0.0.1`, or `*.local` | **Excluded** — local dev against shared Redis |

Legitimate public visitors on the canonical Production domain are never excluded by host rules.

### Admin activity

Identified by the event `path` (pathname only, query stripped):

| Path | Result |
|---|---|
| Exactly `/admin` or any path starting with `/admin/` | **Excluded** (`skipped: admin_path`) |

This covers admin page views and any admin-originated actions that would otherwise post to `/api/track-event`.

Report aggregation also ignores any historical events whose `path` is under `/admin` (defense in depth for data collected before this gate).

---

## Instant Quote funnel counting

- **Quote start (`instant_quote_started`):** fired once per browser session when the Instant Quote calculator mounts. CTA buttons that navigate to `/instant-quote` do **not** fire a start.
- **Quote completion (`instant_quote_completed`):** fired once after a successful Instant Quote contact submit (same success path as the CRM lead + notification email). Submit is locked against double-clicks.
- **CRM lead + email:** one `submitLead` call per successful Instant Quote (creates one Redis lead and one FormSubmit notification).

---

## Phone click tracking

Public `tel:` links go through `PhoneLink` / `CallButton` (`src/components/ui/Button.jsx`), which record `phone_clicked`. Covered surfaces include header, footer, contact, hero, Instant Quote, book-online, service, city, and other pages that use those components.

---

## Environment variables

Set these in the Vercel project (Preview + Production). Never commit secrets.

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key for transactional email |
| `ANALYTICS_REPORT_TO_EMAIL` | Recipient (Mike’s inbox) |
| `ANALYTICS_REPORT_FROM_EMAIL` | Verified From address, e.g. `reports@yourdomain.com` or `Mike's Exterior <reports@…>` |
| `CRON_SECRET` | Shared secret; Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` |
| Existing | `ADMIN_DASHBOARD_PASSWORD`, Upstash/`KV_REST_API_*` (unchanged) |

The admin UI shows whether each variable is **configured** but never reveals secret values.

---

## Resend domain verification

1. Create a Resend account and API key.
2. Add your sending domain (or subdomain) in Resend → Domains.
3. Add the DNS records Resend provides (SPF, DKIM, and any DMARC guidance).
4. Wait until the domain shows **Verified**.
5. Set `ANALYTICS_REPORT_FROM_EMAIL` to an address on that verified domain.
6. Send a **test email** from `/admin/reports` and confirm delivery (and spam folder if needed).

Until the domain is verified, Resend may reject sends or only allow limited testing.

---

## Cron schedule

Configured in `vercel.json`:

```json
"crons": [{ "path": "/api/cron/analytics-reports", "schedule": "0 15 * * *" }]
```

- Runs **once daily** at **15:00 UTC** (~8:00 AM Pacific during PDT, ~7:00 AM Pacific during PST).
- Hobby plans allow one cron invocation per day; this single job decides what (if anything) to send.

On each run (America/Los_Angeles):

| Pacific day | Action |
|---|---|
| **Monday** | Send **weekly** report for previous Monday–Sunday (if weekly enabled) |
| **1st of month** | Send **monthly** report for previous calendar month (if monthly enabled) |
| Both (Monday the 1st) | Send weekly **and** monthly |
| Any other day | Send nothing |

---

## Date-range rules

Timezone: **America/Los_Angeles**.

- **Weekly:** previous complete Mon–Sun. Example key: `weekly:2026-07-13:2026-07-19`.
- **Monthly:** previous complete calendar month. Example key: `monthly:2026-06`.
- Comparisons use the immediately prior week/month.
- Percentage change with a zero baseline shows `n/a (no prior baseline)` — never ∞%.

---

## Redis keys

| Key | Purpose |
|---|---|
| `analytics:report:settings` | Non-secret preferences (weekly/monthly enabled) |
| `analytics:report:delivery:{periodKey}` | Delivery / archive record (status, timestamps, safe HTML preview) |
| `analytics:report:history` | Sorted set of period keys (newest first) |
| `analytics:report:lock:{periodKey}` | Short-lived lock to prevent concurrent duplicate sends |

**Existing analytics/CRM keys are never reset or deleted** (`analytics:events`, leads, projects, etc.).

Delivery records store aggregate metrics HTML only — **no customer names, phones, emails, addresses, or notes**.

---

## Duplicate prevention

1. Before sending a scheduled report, check Redis for `status: sent` on that `periodKey`.
2. Acquire a short NX lock so overlapping cron retries cannot double-send.
3. On success, write `status: sent` with provider message id.
4. On failure, write `status: failed` (not sent) so a later intentional retry/resend can run.
5. Admin **Resend** uses `force: true` for intentional retries.
6. **Send test** uses a unique `:test:` period key so tests do not block the real period.

---

## How to test without a real scheduled send

1. Open Preview → `/admin/reports` and sign in.
2. **Generate weekly/monthly preview** — builds HTML in-admin; does not email the scheduled period as “sent”.
3. **Send test weekly/monthly email** — emails Mike with a `[TEST]` subject; does not mark the real period delivered.
4. Offline unit tests (no Redis/email):

```bash
npm run test:reports
```

5. Manual cron (Preview/Production) only when `CRON_SECRET` is set:

```bash
curl -X POST "https://<preview-host>/api/cron/analytics-reports" \
  -H "Authorization: Bearer $CRON_SECRET"
```

On a non-Monday / non-1st, the response should show `skipped: not_due` for both types.

---

## Metrics included

From analytics events + CRM leads + published projects when available:

- Unique visitors, page views, top pages, traffic sources, referring domains, devices  
- **Quote funnel:** starts, completions, completion rate (shows `n/a (no quote starts)` when starts = 0)  
- **Leads & calls (labeled as event/form counts, not unique customers):** phone clicks, contact form events, booking request events, total CRM leads  
- Visitor→CRM lead rate; leads by source / service / city  
- Completed projects published in-range  

Unavailable sources are labeled **Unavailable** (never invented).

---

## Security

- Cron endpoint requires `CRON_SECRET`.
- Admin report APIs require the admin session cookie.
- Unauthenticated access → **401**.
- Aggregate business data only in emails and history.
- Do not log API keys, email HTML, or customer fields.

---

## Hobby function note

`api/debug/analytics.js` was replaced by `api/cron/analytics-reports.js` so the project stays within Vercel Hobby’s **12 serverless functions**. Report admin actions live on `api/admin/metrics` (`?view=reports` + POST actions).
