# Google Business Profile → website reviews sync (Phase 1)

This site caches public Google reviews in Upstash Redis and serves them from `GET /api/google-reviews`. A daily Vercel Cron job and an admin **Sync Google Reviews** button refresh that cache from the Google Business Profile Reviews API.

## Hobby plan cron limit (important)

On the **Vercel Hobby** plan, cron jobs may run **at most once per day**. More frequent schedules fail at deploy time.

This project uses:

```json
"crons": [{ "path": "/api/google-reviews", "schedule": "0 15 * * *" }]
```

That is **once daily around 15:00 UTC** (timing may drift up to ~59 minutes on Hobby). Vercel Cron sends a **GET** request. When `CRON_SECRET` is set, Vercel adds `Authorization: Bearer <CRON_SECRET>`.

**Set `CRON_SECRET` to the same value as `REVIEWS_SYNC_SECRET`** so the daily GET triggers a sync before serving the public payload.

For hourly (or faster) syncs, upgrade to Vercel Pro or call `POST /api/google-reviews` from an external scheduler with the sync secret.

## What gets stored (public-safe only)

Redis key: `reviews:public:snapshot`

- Review id
- Reviewer display name
- Star rating
- Review text
- Create / update timestamps (display date derived)
- Shared Google/Maps listing URL (when configured)
- Average rating + total review count

**Never stored or returned:** OAuth secrets, refresh tokens, account/location IDs, owner replies, or raw Google API payloads.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Notes |
|------|--------|
| `GOOGLE_GBP_CLIENT_ID` | OAuth 2.0 Client ID (Web application) |
| `GOOGLE_GBP_CLIENT_SECRET` | OAuth client secret — server only |
| `GOOGLE_GBP_REFRESH_TOKEN` | Long-lived refresh token for the managing Google account |
| `GOOGLE_GBP_ACCOUNT_ID` | Numeric/string account id (or `accounts/{id}`) |
| `GOOGLE_GBP_LOCATION_ID` | Location id (or `…/locations/{id}`) |
| `REVIEWS_SYNC_SECRET` | Random secret for cron/manual automated sync |
| `CRON_SECRET` | Set **equal to** `REVIEWS_SYNC_SECRET` so Vercel Cron is authorized |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Existing Upstash Redis (auto-injected) |
| `VITE_GOOGLE_REVIEWS_URL` | Public GBP/Maps URL for “Read more on Google” / attribution |

Do **not** prefix GBP secrets with `VITE_`. Do **not** commit real values.

Optional legacy (unused by Phase 1 sync): `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID`.

## Human setup steps (Google Cloud + Business Profile)

### 1. Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable **Google Business Profile API** (My Business Account Management / Business Profile APIs as shown in Console for your project).  
   You need the APIs that allow `accounts.locations.reviews.list` (Business Profile Performance / Business Information APIs vary by Console labeling — enable the **Google My Business API** / **Business Profile API** packages Google lists for reviews).

### 2. OAuth consent + credentials

1. APIs & Services → **OAuth consent screen** (External or Internal).
2. Add scopes for Business Profile management, typically:
   - `https://www.googleapis.com/auth/business.manage`
3. APIs & Services → **Credentials** → Create **OAuth client ID** → Application type **Web application**.
4. Add an authorized redirect URI you control for the one-time auth (e.g. `https://developers.google.com/oauthplayground` if using OAuth Playground, or your own localhost callback).
5. Copy **Client ID** and **Client Secret** into Vercel as `GOOGLE_GBP_CLIENT_ID` / `GOOGLE_GBP_CLIENT_SECRET`.

### 3. Authorize the Google account that manages the verified listing

1. Sign in with the Google account that is an owner/manager of the **verified** Business Profile.
2. Complete the OAuth flow with `access_type=offline` and `prompt=consent` so Google returns a **refresh token**.
3. Using [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) (optional):
   - Gear icon → “Use your own OAuth credentials”
   - Authorize the `business.manage` scope
   - Exchange the code for tokens
   - Copy the **refresh_token** into `GOOGLE_GBP_REFRESH_TOKEN`

### 4. Resolve account ID and location ID

With a valid access token (from the same OAuth client):

```http
GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts
Authorization: Bearer ACCESS_TOKEN
```

Note the account name, e.g. `accounts/123456789`.

Then list locations (API version/path may vary; common pattern):

```http
GET https://mybusinessbusinessinformation.googleapis.com/v1/accounts/ACCOUNT_ID/locations
Authorization: Bearer ACCESS_TOKEN
```

Or the v4 locations list for your account. Copy the location’s id segment into `GOOGLE_GBP_LOCATION_ID`.

Confirm the location is **verified** — `reviews.list` only works for verified locations.

### 5. Deploy env vars and first sync

1. Add all variables in Vercel (Production + Preview as needed).
2. Redeploy.
3. Sign in to `/admin/dashboard` → **Sync Google Reviews**.
4. Confirm `/#reviews` shows live reviews and the badge count/rating update.
5. Confirm daily cron appears under the Vercel project → Cron Jobs.

## API behavior

| Method | Auth | Behavior |
|--------|------|----------|
| `GET /api/google-reviews` | None | Public Redis snapshot (newest first) or hard-coded fallback |
| `GET /api/google-reviews` | `Bearer REVIEWS_SYNC_SECRET` | Sync, then public payload (used by Vercel Cron) |
| `POST /api/google-reviews` | Admin cookie **or** sync secret | Sync; returns `{ ok, reviewCount, storedReviews, rating, syncedAt }` only |

Unauthorized sync → **401**.

## Security checklist

- [ ] No `VITE_` prefix on GBP secrets
- [ ] Sync secret not embedded in frontend code
- [ ] Public JSON never includes account/location IDs or owner replies
- [ ] Logs only counts/status — not review bodies or tokens

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `GBP OAuth is not configured` | Missing one of the five `GOOGLE_GBP_*` vars |
| `Reviews storage not configured` | Redis / KV env missing |
| `401` on admin sync | Not signed in to admin |
| Cron does not refresh | `CRON_SECRET` ≠ `REVIEWS_SYNC_SECRET`, or Hobby cron not enabled on deployment |
| Empty / fallback reviews | Sync never succeeded; run admin sync and check function logs (no secrets) |
