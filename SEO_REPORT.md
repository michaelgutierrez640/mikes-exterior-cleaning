# SEO & Lead Generation Implementation Report
**Site:** https://mikesexteriorcleaning.com  
**Date:** July 7, 2026  
**Scope:** Full-site SEO audit, location pages, service page enhancements, blog/resources, schema, Core Web Vitals, and internal linking.

---

## Executive Summary

This update transforms mikesexteriorcleaning.com from a single-page marketing site with thin city stubs into a **multi-page local SEO architecture** designed to rank for exterior cleaning services across the Central Valley and convert visitors into quote requests.

**42 URLs** are now indexed in `sitemap.xml`, including 7 fully optimized location hubs, 5 service pages, 9 window-cleaning city pages, 15 resource articles, and supporting pages.

---

## 1. Location Pages (7 Cities)

### What was built
Rich, unique location hub pages at `/service-areas/:city` for:

| City | URL |
|------|-----|
| Modesto | `/service-areas/modesto` |
| Salida | `/service-areas/salida` |
| Riverbank | `/service-areas/riverbank` |
| Ceres | `/service-areas/ceres` |
| Turlock | `/service-areas/turlock` |
| Ripon | `/service-areas/ripon` |
| Oakdale | `/service-areas/oakdale` |

### Each page includes
- Unique SEO title, meta description, and keywords
- 800–1,200+ words of city-specific content (intro, local conditions, neighborhoods, services, why choose us)
- 8 unique FAQs with **FAQPage** schema
- Internal links to all 5 service pages + window-cleaning city page (where available)
- **LocalBusiness**, **Organization**, **Service**, **FAQPage**, and **BreadcrumbList** JSON-LD
- Breadcrumb navigation, trust badges, mid-page CTA, and final CTA
- Cross-links to other location pages

### Why it helps SEO
- Targets `"exterior cleaning [city]"` and related local intents
- Unique content avoids duplicate-content penalties vs. generic templates
- FAQ schema enables rich results in Google
- Internal linking distributes authority to service and city pages

### Content location
`src/content/cities/location/*.js`

### Note on Manteca, Tracy, Stockton
These cities retain basic hub pages (service grid + CTA) without full content modules. Priority markets per this build are the 7 cities above.

---

## 2. Service Page Improvements

### All 5 service pages enhanced
- `/services/window-cleaning`
- `/services/pressure-washing`
- `/services/gutter-cleaning`
- `/services/solar-panel-cleaning`
- `/services/commercial-window-cleaning`

### Already present (prior build) + new in this update
| Section | Status |
|---------|--------|
| Before/after gallery | ✅ Per-service sliders + placeholders |
| Benefits section | ✅ 6 cards per service |
| Process timeline (5 steps) | ✅ |
| FAQ section (12+ FAQs) | ✅ With FAQPage schema |
| Strong CTAs | ✅ Hero, mid-page, pricing, final |
| DIY comparison | ✅ |
| Testimonials (Google reviews) | ✅ |
| Trust badges | ✅ |
| **Location links (NEW)** | ✅ All 7 priority cities on every service page |
| Service schema | ✅ Organization + LocalBusiness + Service + FAQ + Breadcrumb |

### Why it helps SEO
- Service pages now link to every priority location hub — strengthening local relevance signals
- Comprehensive content + schema supports topical authority for each service line
- Multiple CTAs improve lead conversion rate (primary business goal)

---

## 3. Resources / Blog Section

### New routes
- **Hub:** `/resources` — lists all 15 articles
- **Articles:** `/resources/:slug` — individual guides

### 15 SEO article templates
Targeting local search intent across window cleaning, pressure washing, gutters, solar, and general exterior care. Topics include:

1. How often to clean windows in Modesto
2. Hard water stains on Central Valley windows
3. Best time to pressure wash driveways in Stanislaus County
4. Solar panel cleaning for CA dust/pollen
5. Gutter cleaning before rainy season (Modesto)
6. Spring pollen window cleaning tips
7. Commercial storefront cleaning (Modesto)
8. Pressure washing vs. soft wash
9. Why hire professional window cleaners
10. Exterior cleaning and curb appeal value
11. Agricultural dust exterior cleaning (Turlock)
12. Two-story window cleaning safety
13. Gutter overflow damage prevention (Ripon)
14. Oakdale ranch property maintenance
15. Ceres homeowner exterior cleaning checklist

Each article: 600–900 words, unique H2 sections, meta tags, **Article** + **BreadcrumbList** schema, links to related services and city pages.

### Why it helps SEO
- Captures informational queries (`"how often clean windows modesto"`, etc.)
- Builds topical authority and internal link equity
- Supports long-tail local traffic that converts to service pages

### Content location
`src/content/blog/articles.js`

---

## 4. Sitemap & Robots

| File | Status |
|------|--------|
| `public/sitemap.xml` | ✅ **42 URLs** — auto-generated |
| `public/robots.txt` | ✅ Allows all crawlers, references sitemap |
| `scripts/generate-sitemap.mjs` | ✅ Runs automatically on `npm run build` |

### Submit to Google Search Console
After deploy, submit: `https://mikesexteriorcleaning.com/sitemap.xml`

---

## 5. Core Web Vitals & Performance

### Implemented
| Optimization | Detail |
|--------------|--------|
| **Route code splitting** | `React.lazy()` for all inner pages — smaller initial JS bundle (~91 KB vs. ~570 KB monolith) |
| **Lazy-loaded images** | `loading="lazy"` + `decoding="async"` on all non-hero images via `ResponsiveImage` |
| **WebP srcSet** | Responsive WebP variants for gallery, heroes, and before/after images |
| **Async font loading** | Google Fonts loaded via `preload` + `onload` swap — non-render-blocking |
| **Reduced font weights** | Removed unused 500-weight cuts |
| **Hero preload only** | Single LCP image preloaded in `index.html` |
| **Particles** | `aria-hidden="true"` — decorative only |

### Build output (post-optimization)
- Main chunk: ~133 KB gzip (down from single ~163 KB bundle with all pages)
- Article content: separate 27 KB gzip chunk (loaded only on `/resources/*`)
- Service pages: ~7 KB gzip each (on demand)

### Remaining for 95+ Lighthouse (recommended)
1. **Prerender or SSR** — Meta tags and JSON-LD are client-injected; Google renders JS but prerendering guarantees crawler coverage and faster FCP for SEO bots
2. **Self-host fonts** — Eliminate third-party Google Fonts request entirely
3. **Set `googleReviewsUrl`** in `business.js` when GBP link is available — enables review badge links
4. **Compress hero JPEG** — Run `npm run organize-images` or manual sharp pass on hero-bg.jpg if LCP > 2.5s

---

## 6. Schema Markup (Site-Wide)

| Schema Type | Where Applied |
|-------------|---------------|
| **Organization** | Homepage, location pages, service pages, articles |
| **WebSite** | Homepage, resources hub |
| **LocalBusiness** | All major pages (with aggregateRating 5.0 / 44 reviews) |
| **Service** | Service pages, location hubs, window-cleaning city pages |
| **FAQPage** | Homepage FAQs, all service pages, location pages, WC city pages |
| **BreadcrumbList** | All inner pages |
| **Article** | All 15 resource articles |

### Default social sharing
- `DEFAULT_OG_IMAGE` set site-wide
- `og:url`, `og:image`, `twitter:image`, and `twitter:card` on all pages via `SeoHead`

---

## 7. SEO & Accessibility Audit — Issues Found & Fixed

| Issue | Fix |
|-------|-----|
| Thin duplicate CityPage content | Replaced with 7 unique rich location modules |
| No blog/resources section | Added `/resources` with 15 articles |
| Missing Organization schema | Added `getOrganizationSchema()` |
| Homepage FAQ missing schema | Added FAQPage to `getHomePageSchemas()` |
| No `og:image` on any page | Default OG image on all routes |
| No `og:url` | Added via canonical in `SeoHead` |
| Footer service areas plain text | Linked to 7 priority location pages |
| No Resources in navigation | Added to header/footer nav |
| Service pages missing location links | `LocationLinks` component on all 5 services |
| Monolithic JS bundle | Route-level code splitting |
| Render-blocking fonts | Async font loading |
| No 404 page | Added `NotFoundPage` |
| Manual sitemap drift risk | Auto-generated on build |
| Missing canonical on homepage HTML | Added to `index.html` |
| Orphan `SeoSchema.jsx` | Superseded by per-page `JsonLd` (file retained but unused) |

### Not changed (low priority / needs business input)
- **SPA-only meta injection** — Requires prerender plugin or hosting SSR for maximum crawler compatibility
- **GBP geo coordinates** — Add street address + lat/long to LocalBusiness when available
- **Google Reviews URL** — Set `googleReviewsUrl` in `business.js` for clickable review badge
- **Manteca / Tracy / Stockton** — Basic hubs only; expand when ready

---

## 8. Internal Linking Architecture

```
Homepage
├── Services (5 pages) → Location hubs (7) + Resources
├── Service Areas hub → All cities + WC city pages
├── Resources (15 articles) → Services + city pages
├── Window Cleaning city pages (9) → Service page + location hubs
└── Location hubs (7) → All services + WC pages + nearby cities

Footer → 7 priority cities + Resources
Header → Service Areas + Resources
```

---

## 9. Lead Generation Improvements

- **CTAs on every page type:** Quote button + phone on heroes, mid-page banners, and final sections
- **Trust signals:** Licensed, Insured, Satisfaction Guaranteed, Locally Owned badges; 5.0 / 44 Google reviews
- **Reduced friction:** Free estimate messaging on every location and service page
- **Content funnel:** Blog articles → service pages → contact form
- **Mobile:** Existing responsive design preserved; service-section spacing optimized for mobile readability

---

## 10. Recommended Next Steps (Priority Order)

1. **Submit sitemap** to Google Search Console and Bing Webmaster Tools
2. **Add prerendering** (e.g., `vite-plugin-prerender`) for guaranteed meta/schema indexing
3. **Set Google Business Profile URL** in `business.js` for review badge links
4. **Add full location pages** for Manteca, Tracy, and Stockton (copy the 7-city pattern)
5. **Per-service city pages** for pressure washing and gutters (e.g., `/pressure-washing/ceres`) to capture `"pressure washing ceres"` intent
6. **Replace before/after placeholders** for solar, gutter, and commercial with real project photos
7. **Run Lighthouse** on live site post-deploy; target LCP < 2.5s, CLS < 0.1
8. **Track conversions** — Add Google Analytics 4 + call tracking for (209) 496-5519
9. **Publish 1–2 new resource articles monthly** using the existing template structure in `src/content/blog/articles.js`
10. **Build local citations** — Ensure NAP consistency (Name, Address, Phone) across Yelp alternatives, BBB, Angi, etc.

---

## File Reference

| Purpose | Path |
|---------|------|
| Location content | `src/content/cities/location/` |
| Blog articles | `src/content/blog/` |
| SEO utilities | `src/config/seo.js` |
| Sitemap generator | `scripts/generate-sitemap.mjs` |
| Location page template | `src/pages/CityPage.jsx` |
| Resources hub | `src/pages/ResourcesPage.jsx` |
| Article template | `src/pages/ResourceArticlePage.jsx` |
| Location links on services | `src/components/service/LocationLinks.jsx` |

---

*Report generated as part of the July 2026 SEO & lead generation build for Mike's Exterior Cleaning Services.*
