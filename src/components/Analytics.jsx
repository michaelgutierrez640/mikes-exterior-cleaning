import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../utils/analytics'

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID

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
}

export default function Analytics() {
  const location = useLocation()

  useEffect(() => {
    initGoogleAnalytics()
    initMetaPixel()
  }, [])

  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location.pathname, location.search])

  return null
}
