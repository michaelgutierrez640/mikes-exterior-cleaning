import { useEffect } from 'react'
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_TYPE,
  DEFAULT_OG_IMAGE_WIDTH,
} from '../../config/site'

function upsertMeta(attr, key, content) {
  if (content === undefined || content === null || content === '') return
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', String(content))
}

function upsertLink(rel, href) {
  if (!href) return
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function isDefaultOgImage(image) {
  return !image || image === DEFAULT_OG_IMAGE
}

/**
 * Client-side document head updates for SPA routes (Vite/React).
 * Pair with static prerender for crawler / messaging-app coverage.
 */
export default function SeoHead({
  title,
  description,
  keywords,
  canonical,
  ogType = 'website',
  ogImage,
  ogImageAlt,
  noindex = false,
}) {
  useEffect(() => {
    const image = ogImage || DEFAULT_OG_IMAGE
    const useBrandedDimensions = isDefaultOgImage(image)
    const imageAlt = useBrandedDimensions
      ? ogImageAlt || DEFAULT_OG_IMAGE_ALT
      : ogImageAlt || title

    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'keywords', keywords)
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', ogType)
    upsertMeta('property', 'og:image', image)
    upsertMeta('property', 'og:image:secure_url', image)
    if (useBrandedDimensions) {
      upsertMeta('property', 'og:image:width', String(DEFAULT_OG_IMAGE_WIDTH))
      upsertMeta('property', 'og:image:height', String(DEFAULT_OG_IMAGE_HEIGHT))
      upsertMeta('property', 'og:image:type', DEFAULT_OG_IMAGE_TYPE)
    }
    upsertMeta('property', 'og:image:alt', imageAlt)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', image)
    upsertMeta('name', 'twitter:image:alt', imageAlt)
    if (canonical) {
      upsertLink('canonical', canonical)
      upsertMeta('property', 'og:url', canonical)
    } else if (noindex) {
      // Soft 404 / noindex routes must not keep the previous page or shell homepage canonical.
      document.querySelector('link[rel="canonical"]')?.remove()
      document.querySelector('meta[property="og:url"]')?.remove()
    }
  }, [title, description, keywords, canonical, ogType, ogImage, ogImageAlt, noindex])

  return null
}
