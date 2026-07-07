import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../utils/analytics'

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || ''
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID?.trim() || ''
const ANALYTICS_ENABLED = Boolean(GA_ID || META_PIXEL_ID)

function loadScript(src, id) {
  if (document.getElementById(id)) return
  const script = document.createElement('script')
  script.id = id
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

function initGoogleAnalytics() {
  if (!GA_ID || window.gtag) return

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { send_page_view: false })

  loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`, 'ga-script')
}

function initMetaPixel() {
  if (!META_PIXEL_ID || window.fbq) return

  const n = (window.fbq = function fbq() {
    if (n.callMethod) n.callMethod.apply(n, arguments)
    else n.queue.push(arguments)
  })
  if (!window._fbq) window._fbq = n
  n.push = n
  n.loaded = true
  n.version = '2.0'
  n.queue = []

  loadScript('https://connect.facebook.net/en_US/fbevents.js', 'meta-pixel-script')
  window.fbq('init', META_PIXEL_ID)

  if (!document.getElementById('meta-pixel-noscript')) {
    const noscript = document.createElement('noscript')
    noscript.id = 'meta-pixel-noscript'
    const img = document.createElement('img')
    img.height = 1
    img.width = 1
    img.style.display = 'none'
    img.alt = ''
    img.src = `https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`
    noscript.appendChild(img)
    document.body.appendChild(noscript)
  }
}

export default function Analytics() {
  const location = useLocation()
  const warned = useRef(false)

  useEffect(() => {
    if (!ANALYTICS_ENABLED) {
      if (import.meta.env.PROD && !warned.current) {
        warned.current = true
        console.info(
          '[Analytics] Set VITE_GA_MEASUREMENT_ID and VITE_META_PIXEL_ID in Vercel, then redeploy.',
        )
      }
      return
    }
    initGoogleAnalytics()
    initMetaPixel()
  }, [])

  useEffect(() => {
    if (!ANALYTICS_ENABLED) return
    trackPageView(location.pathname + location.search)
  }, [location.pathname, location.search])

  return null
}
