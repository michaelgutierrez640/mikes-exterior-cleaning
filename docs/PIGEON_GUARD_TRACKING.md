# Solar Panel Pigeon Guard — conversion tracking

## Vercel environment variables (existing names)

Do **not** invent alternate names. The app already uses:

| Variable | Where used | Purpose |
|---|---|---|
| `VITE_GA_MEASUREMENT_ID` | `src/components/Analytics.jsx`, `src/utils/analytics.js` | GA4 measurement ID |
| `VITE_META_PIXEL_ID` | `src/components/Analytics.jsx`, `src/utils/analytics.js` | Meta Pixel ID |

Scripts load only when the corresponding variable is set. Leave both empty on Preview until Production activation.

**Do not change Production env vars from this PR.** Activate later by setting the two variables on the Production environment and redeploying.

## GA4 events

| Event | When |
|---|---|
| `pigeon_guard_page_view` | Landing `/services/pigeon-guard` loads (once per session) |
| `pigeon_guard_estimate_clicked` | Estimate CTA clicked (hero / mid-page / sticky) |
| `pigeon_guard_call_clicked` | Call button clicked |
| `pigeon_guard_form_started` | First form interaction (once per session) |
| `pigeon_guard_form_submitted` | CRM lead API returns a lead id |
| `pigeon_guard_form_failed` | Submit fails after validation (timeout/network) |

## Meta Pixel events

| Event | When |
|---|---|
| `ViewContent` | Landing loads (once per session; not Lead) |
| `Contact` | Call button clicked |
| `Lead` | **Only** after CRM lead create confirms (`id` present) |

Never fire Meta `Lead` on CTA click or form start.

## Parameters (non-PII)

Every event includes when available:

- `service`: `pigeon_guard`
- `page_path`: `/services/pigeon-guard`
- `utm_source` / `utm_medium` / `utm_campaign` / `utm_term` / `utm_content`
- `city` when voluntarily provided and looks like a city name
- `problems` as normalized keys only (`nesting`, `droppings`, `noise`, `preventative`, `not_sure`)

Never includes name, phone, email, street address, or notes.

## CRM UTMs

`getLeadAttribution()` (first-touch UTMs + conversion page) is attached on lead ingest via `createCrmLead` / `submitLead`. No change required for UTM persistence on the lead.

## Safety

- Tracking failures are swallowed and never block form submit.
- Session flags prevent duplicate page_view / form_started / form_submitted / Meta ViewContent on React remounts.
- First-party `/api/track-event` still runs on Production hosts only.
- SMS and customer photo uploads remain disabled.
