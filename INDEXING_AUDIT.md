# Indexing Audit — Local SEO Strengthening

**Branch:** `cursor/indexing-strengthening`  
**Base:** `main` @ `b5f12a1` (CRM follow-up reminders merged)  
**Domain:** `https://www.mikesexteriorcleaning.com`  
**Date:** 2026-07-21  

No new city pages were created. Instant Quote was deprioritized in the sitemap (priority `0.5`) and is not a focus for indexing.

---

## Production baseline (before this Preview)

| Priority URL | HTTP | Canonical (self) | robots | Sitemap | H1 in HTML | Unique title | Notes |
|---|---|---|---|---|---|---|---|
| `/window-cleaning/modesto` | 200 | yes | `index, follow` | 1× | missing (SPA) | yes | Duplicate `name=description` (shell + injected) — **fixed in branch** |
| `/service-areas/modesto` | 200 | yes | `index, follow` | 1× | missing (SPA) | yes | Same meta-description bug |
| `/window-cleaning/ripon` | 200 | yes | `index, follow` | 1× | missing (SPA) | yes | Same |
| `/window-cleaning/riverbank` | 200 | yes | `index, follow` | 1× | missing (SPA) | yes | Same |
| `/window-cleaning/salida` | 200 | yes | `index, follow` | 1× | missing (SPA) | yes | Same |
| `/window-cleaning/turlock` | 200 | yes | `index, follow` | 1× | missing (SPA) | yes | Same |
| `/window-cleaning/tracy` | 200 | yes | `index, follow` | 1× | missing (SPA) | yes | Same |

**robots.txt:** `Allow: /`, `Disallow: /admin`, sitemap points to production domain.  
**Redirect chains:** none observed on direct requests (HTTP 200).  
**Sitemap (~49 URLs):** production domain only; no `/admin`, no Preview hosts, no duplicate locs in sample.  
**Structured data (production):** Service + FAQ + Breadcrumb + LocalBusiness present in prerendered head; city/service match looks correct for WC Modesto.

### Internal links (production static HTML)

SPA body was not prerendered, so homepage / WC hub HTML showed **0** crawlable `href`s to Modesto city pages before this branch. Links existed only after JS. That is a crawl-path weakness for first-pass indexing.

---

## Duplicate-content concerns

| Issue | Severity | Recommendation / fix |
|---|---|---|
| Shared template across WC city pages | Medium | Already had city-specific intros/neighborhoods/FAQs. **Completed:** unique titles/descriptions + `serviceDetails` sections on priority cities. |
| Generic shell `meta description` left in HTML alongside page description | High | **Completed:** prerender now replaces multiline/shell description; `index.html` metas flattened. |
| H1 only after JS | High | **Completed:** prerender injects route H1 + key `<a>` links into `#root` (replaced by React on load). |
| RelatedProjects copy said “nearby” while API is exact city+service | Low | **Completed:** copy corrected. |
| WC city ↔ service-area missing backlinks | Medium | **Completed:** bidirectional links + Modesto hub CTA on WC service page. |
| Project detail lacked WC city landing link | Medium | **Completed:** `projectCityServicePath()` for window-cleaning jobs. |

No invented jobs, neighborhoods, reviews, or stats were added.

---

## Changes completed (this branch)

1. **Modesto WC page (highest priority)**  
   - H1: `Professional Window Cleaning in Modesto, CA`  
   - Unique title/description  
   - Explicit interior/exterior, screens/tracks, hard-water `serviceDetails`  
   - Call Now + Instant Quote CTAs  
   - Service + Breadcrumb schema (existing, verified)

2. **Uniqueness** on Ripon, Riverbank, Salida, Turlock, Tracy — distinct titles/descriptions + city-specific service details.

3. **Internal linking**  
   - Homepage ServiceAreas: stronger Modesto service-area link  
   - `/services/window-cleaning` → `/window-cleaning/modesto`  
   - `/service-areas/{city}` window-cleaning item → `/window-cleaning/{city}`  
   - WC city → `/service-areas/{city}`  
   - `/projects` footer links to priority WC cities  
   - Project detail → matching WC city page when applicable  
   - Prerender crawl shell links on home, service, WC city, and location hubs

4. **Completed Jobs**  
   - Confirmed API filters published-only, exact `service` + `city`, newest first  
   - RelatedProjects subheads no longer claim “nearby”

5. **Sitemap**  
   - Modesto WC priority `0.9`  
   - Instant Quote priority lowered to `0.5`  
   - Still excludes admin / drafts / Preview hosts

6. **Prerender technical fix**  
   - Reliable unique `description` / keywords replacement  
   - Crawlable H1 + related anchors in initial HTML for key routes

---

## Priority URL status after changes (verify on Preview)

| URL | Indexability | Sitemap | Duplicate risk | Recommended next step |
|---|---|---|---|---|
| `/window-cleaning/modesto` | indexable | present (prio 0.9) | low after uniqueness pass | Request indexing in GSC after Production deploy |
| `/service-areas/modesto` | indexable | present | distinct hub vs WC page | Keep both; reciprocal links now in place |
| `/window-cleaning/ripon` | indexable | present | low | GSC inspection after deploy |
| `/window-cleaning/riverbank` | indexable | present | low | GSC inspection after deploy |
| `/window-cleaning/salida` | indexable | present | low | GSC inspection after deploy |
| `/window-cleaning/turlock` | indexable | present | low | GSC inspection after deploy |
| `/window-cleaning/tracy` | indexable | present | low | GSC inspection after deploy |

Re-check on Preview: HTTP 200, single self-canonical, single unique description, H1 in raw HTML, sitemap entry once, Service schema city match.

---

## Resource articles (unindexed / secondary) — recommendations only

Do **not** delete or merge without approval. All ~600–700 words; none are stub-thin, but several share intent.

| Article | Flag | Recommendation |
|---|---|---|
| `how-often-clean-windows-modesto-ca` | Strong Modesto WC support | **Improve / keep primary** — add crawlable link to `/window-cleaning/modesto` if missing |
| `hard-water-stains-central-valley-windows` | Overlaps WC FAQs | **Keep secondary** — good topical support |
| `spring-pollen-window-cleaning-central-valley` | Overlaps “how often” + WC FAQs | **Consider consolidation** later with “how often” or keep as seasonal piece |
| `why-hire-professional-window-cleaners` | Generic intent | **Keep secondary** — less local; not a priority for indexing |
| `two-story-window-cleaning-safety` | Niche safety intent | **Keep secondary** |
| `commercial-storefront-cleaning-modesto` | Distinct commercial intent | **Improve** — strengthen Modesto commercial angle + link to WC Modesto |
| `gutter-cleaning-before-rainy-season-modesto` | Solid local gutter | **Keep** — supports Modesto hub, not WC priority |
| `gutter-overflow-damage-prevention-ripon` | Local Ripon | **Keep secondary** |
| `agricultural-dust-exterior-cleaning-turlock` | Local Turlock | **Keep** — supports Turlock; light WC overlap OK |
| `oakdale-ranch-property-exterior-maintenance` | Oakdale general | **Remain secondary** |
| `ceres-homeowner-exterior-cleaning-checklist` | Ceres checklist | **Remain secondary** / possible thin checklist feel |
| `best-time-pressure-wash-driveways-stanislaus-county` | PW intent | Out of WC priority scope |
| `pressure-washing-vs-soft-wash-central-valley` | PW intent | Out of WC priority scope |
| `solar-panel-cleaning-california-dust-pollen` | Solar intent | Out of WC priority scope |
| `exterior-cleaning-home-curb-appeal-value` | Generic | **Remain secondary** |

**Instant Quote (`/instant-quote`):** keep live for conversions; do not push for organic ranking.

---

## Testing checklist

- [x] Full production build (`npm run build`) — passed locally; sitemap validate passed (46 URLs locally / 49 on Vercel with published projects)
- [x] Direct-route static files generated for all 7 priority URLs under `dist/`
- [x] Sitemap validation (`validate-sitemap` + `--dist`)
- [x] robots.txt check — `Allow: /`, `Disallow: /admin`, production sitemap URL
- [x] Canonical + single unique meta description + H1 in dist HTML for all 7 priority URLs
- [x] Structured data present in prerendered head (Service / FAQ / Breadcrumb)
- [x] Mobile viewport meta present; Preview URL deployed (may require Vercel auth for automated curl)
- [ ] Manual smoke on Preview in browser (open priority URLs)

**Vercel Preview:** https://mikes-exterior-cleaning-747twe3ej-jmrprojects.vercel.app  
**Inspector:** https://vercel.com/jmrprojects/mikes-exterior-cleaning/re5J9Noc4WVwvk9muhryc3gv4CUe  

---

## Deploy note

**Preview only.** Do not merge to `main` or promote to Production until this report and the Vercel Preview are reviewed.

**Git note:** Changes are on branch `cursor/indexing-strengthening` and were deployed from the local working tree. Commit/push when you are ready to preserve the branch on GitHub.
