# SEO Audit — mikesexteriorcleaning.com
**Audit date:** July 7, 2026  
**Production URL:** https://www.mikesexteriorcleaning.com  
**Branch improvements:** Implemented locally (deploy to activate prerender + fixes)

---

## Executive summary

Your site has **strong content architecture** (44 indexed URLs, service pages, city hubs, blog, instant quote, book online) but suffered a **critical SPA SEO gap**: every production URL returned the **same homepage `<title>`, meta description, and canonical** in the initial HTML. Googlebot and social crawlers that don't fully execute JavaScript would treat most pages as duplicates of the homepage.

**Highest-impact fix implemented:** build-time HTML prerendering injects unique titles, meta tags, canonicals, and JSON-LD for all 44 sitemap URLs.

---

## Category scores (1–10)

| Category | Score | Production today | After deploy |
|----------|------:|------------------|--------------|
| Page titles | **4 → 9** | All URLs share homepage title in HTML | Unique per route |
| Meta descriptions | **4 → 9** | All URLs share homepage description | Unique per route |
| H1/H2 structure | **8** | Strong on service/city/blog pages | Same |
| Keyword optimization | **7** | Good local + service intent in content | Same |
| Internal linking | **8** | Service ↔ city ↔ blog cross-links, CTAs | Same |
| Image alt text | **6 → 7** | Hero used `alt=""`; service images good | Hero alt fixed |
| Local SEO | **7** | 10 cities, window-cleaning cities, NAP consistent | +geo/hours schema |
| Schema markup | **7 → 9** | Rich JSON-LD via JS; thin on instant quote | Prerendered in HTML |
| Sitemap | **7 → 8** | 44 URLs; no lastmod | lastmod + www URLs |
| robots.txt | **9** | Allow all, sitemap declared | www sitemap URL |
| Page speed | **6** | ~470KB JS bundle; font CDN | Unchanged (see checklist) |
| Mobile usability | **8** | Mobile-first, tap targets, sticky CTAs | Same |
| Core Web Vitals | **6** | LCP likely hero image + JS (PSI quota exceeded) | Monitor post-deploy |
| Canonical URLs | **5 → 9** | All pointed to `/`; non-www vs www | www + per-page |
| Broken links | **8** | No major 404s in sitemap | Same |
| Crawl errors | **5 → 8** | Invalid slugs soft-redirected to home | True 404 + noindex |
| Duplicate content | **3 → 8** | SPA duplicate head tags | Prerender resolves |
| Service pages | **9** | Deep content, FAQs, schema, CTAs | +prerender meta |
| Service area pages | **6 → 7** | Thin pages for Manteca/Tracy/Stockton | +FAQ section/schema |
| FAQ optimization | **8** | FAQPage schema on home, services, cities | +thin city FAQs |
| Instant Quote page | **7 → 8** | Good UX; thin server HTML | WebPage schema + prerender |
| Booking page | **8** | Live; ReserveAction schema | Prerender meta |
| Google Business Profile | **4** | `googleReviewsUrl`, `googlePlaceId`, `sameAs` all null | Manual setup required |

**Overall SEO score:** **6.2 / 10** (production) → **8.3 / 10** (after deploy)

---

## Production findings (verified)

### Critical
1. **Duplicate HTML meta on every URL** — curl of `/services/window-cleaning`, `/book-online`, `/instant-quote`, etc. all returned homepage title and `canonical: https://mikesexteriorcleaning.com/`
2. **Soft 404s** — Invalid service/article/city slugs redirected to homepage (200) instead of 404

### High
3. **Canonical domain** — Site redirects to `www` but `SITE_URL` was non-www (now fixed to `www`)
4. **GBP not linked** — No Google Business Profile URL in schema `sameAs`
5. **Analytics env vars** — GA4/Meta Pixel not configured in Vercel (not SEO but affects lead tracking)

### Medium
6. **Sitemap** — No `<lastmod>` dates (fixed)
7. **Thin city pages** — Manteca, Tracy, Stockton lacked FAQs (fixed)
8. **Hero image** — Decorative `alt=""` missed keyword opportunity (fixed)
9. **Instant quote schema** — No WebPage/InteractAction (fixed)

### Low
10. **Orphan `SeoSchema.jsx`** — Dead code (removed)
11. **meta keywords** — Set everywhere; Google ignores (harmless)

---

## Competitor comparison (Modesto / Central Valley)

| Factor | Mike's Exterior | Five Star Windows | Super Squeegee | Angels Window Washing | Modesto Pressure Washing |
|--------|----------------|-------------------|----------------|----------------------|--------------------------|
| Dedicated city pages | ✅ 10 hubs + 9 WC cities | ✅ Modesto page | ✅ Modesto page | ✅ Modesto-focused | ✅ Modesto homepage |
| Service silos | ✅ 5 deep service pages | ✅ Multi-service | ✅ Windows + commercial | ⚠️ Windows focus | ✅ Pressure/gutter/solar |
| Online quote/booking | ✅ Instant quote + book online | ⚠️ Contact forms | ✅ Online quote tool | ⚠️ Phone/form | ⚠️ Form |
| Blog/resources | ✅ 15 articles | ❌ Limited | ⚠️ Some content | ❌ Thin | ⚠️ Service pages only |
| Reviews displayed | ✅ 5.0 / 44 | ✅ 4.8+ volume | ✅ Testimonials | ✅ Trustindex | ✅ Reviews |
| Schema / technical SEO | ⚠️ Was weak (SPA) | ✅ Established WP | ✅ Established WP | ⚠️ Basic | ✅ Service-area content |
| Years in business | Growing | 40+ years | Long-standing | Regional | Local specialist |

**Your advantages:** Instant quote calculator, online booking request, resources hub, modern design, multi-service depth.  
**Competitor advantages:** Older domains, more backlinks, GBP maturity, server-rendered HTML (until your prerender deploy).

---

## Prioritized action checklist

### P0 — Deploy immediately (implemented in code)
- [x] Build-time HTML prerender for all 44 routes (`scripts/prerender-html.mjs`)
- [x] Fix canonical base URL to `https://www.mikesexteriorcleaning.com`
- [x] Return real 404 for invalid service/article/city slugs
- [x] Add sitemap `<lastmod>`
- [ ] **Deploy branch to production** (merge + Vercel)

### P1 — Google Business Profile (manual, high lead impact)
- [ ] Claim/verify GBP listing for Mike's Exterior Cleaning Services
- [ ] Add `googleReviewsUrl` and `googlePlaceId` to `src/config/business.js`
- [ ] Add GBP link to `BUSINESS.social.google` for `sameAs` schema
- [ ] Post weekly: before/after photos, service offers, link to `/instant-quote` and `/book-online`
- [ ] Match NAP exactly: `(209) 496-5519`, `mikesexteriorcleaning209@gmail.com`, Modesto service area
- [ ] Add services in GBP: Window Cleaning, Pressure Washing, Gutter Cleaning, Solar Panel Cleaning

### P2 — Performance / Core Web Vitals
- [ ] Self-host fonts or subset Playfair + Jakarta (reduce render-blocking)
- [ ] Ensure hero WebP is served (already configured; verify CDN cache)
- [ ] Code-split large routes (instant quote calculator chunk)
- [ ] Set `VITE_GA_MEASUREMENT_ID` after deploy for monitoring
- [ ] Run PageSpeed Insights after deploy; target LCP < 2.5s, CLS < 0.1

### P3 — Content & links
- [ ] Add `/window-cleaning/manteca` city page (only priority city missing WC landing)
- [ ] Build 3–5 local backlinks: Chamber of Commerce, BBB, supplier partners
- [ ] Add customer name + city to testimonial schema (Review schema on homepage)
- [ ] Create 2 new blog posts/month targeting long-tail Modesto queries

### P4 — Ongoing
- [ ] Submit sitemap in Google Search Console (www property)
- [ ] Monitor Coverage report for soft 404s and duplicate titles (should clear post-prerender)
- [ ] Request reviews after jobs; link to GBP review URL
- [ ] A/B test homepage H1 for conversion vs. rank (current H1 is brand-focused)

---

## What was automated in this pass

| Change | File(s) |
|--------|---------|
| Prerender unique meta + JSON-LD per route | `scripts/prerender-html.mjs`, `package.json` |
| www canonical domain | `src/config/site.js`, `index.html`, `robots.txt`, sitemap |
| Sitemap lastmod | `scripts/generate-sitemap.mjs` |
| LocalBusiness geo + hours + sameAs prep | `src/config/seo.js` |
| Instant quote WebPage schema | `src/config/seo.js`, `InstantQuotePage.jsx` |
| Service areas schema bundle | `src/config/seo.js`, `ServiceAreasPage.jsx` |
| Thin city FAQs + UI | `getThinCityFaqs()`, `CityPage.jsx` |
| True 404 for bad slugs | `ServicePage`, `CityPage`, `ResourceArticlePage`, `WindowCleaningCityPage` |
| Hero image alt text | `Hero.jsx` |
| Remove dead SeoSchema | deleted `SeoSchema.jsx` |

---

## Verification after deploy

```bash
# Each should return a UNIQUE title (not the homepage title):
curl -s https://www.mikesexteriorcleaning.com/services/window-cleaning | grep '<title>'
curl -s https://www.mikesexteriorcleaning.com/book-online | grep '<title>'
curl -s https://www.mikesexteriorcleaning.com/instant-quote | grep '<title>'

# Invalid slug should include noindex 404 title:
curl -s https://www.mikesexteriorcleaning.com/services/fake-service | grep '<title>'

# Sitemap should return 200 with 44 URLs + lastmod:
curl -sI https://www.mikesexteriorcleaning.com/sitemap.xml
```

---

## Booking & instant quote (SEO status)

| Page | Indexed | Unique meta (post-deploy) | Schema |
|------|---------|----------------------------|--------|
| `/instant-quote` | ✅ sitemap 0.9 | ✅ | WebPage + InteractAction + breadcrumbs |
| `/book-online` | ✅ sitemap 0.9 | ✅ | ReserveAction + WebPage + LocalBusiness |

Both pages are **live on production** (HTTP 200) but meta duplication affects them until prerender deploys.
