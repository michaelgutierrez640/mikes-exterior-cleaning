# Analytics email reports (Phase 1)

Private weekly and monthly website-performance emails for Mike, powered by first-party analytics + CRM data already stored in Upstash Redis.

**Admin UI:** `/admin/reports` (password-protected)  
**Cron:** `GET/POST /api/cron/analytics-reports` once daily  
**Public site pages are not modified.**

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
- Phone clicks, Instant Quote starts/completions, contact submissions, booking requests  
- New CRM leads; leads by source / service / city; conversion rate  
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
