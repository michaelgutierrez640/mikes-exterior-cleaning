import { useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'

export default function BackToTop() {
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)
  const [hideForPigeonSticky, setHideForPigeonSticky] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onSticky = (e) => setHideForPigeonSticky(Boolean(e.detail?.visible))
    window.addEventListener('pigeon-sticky-cta', onSticky)
    setHideForPigeonSticky(document.documentElement.classList.contains('pigeon-mid-sticky-cta'))
    return () => window.removeEventListener('pigeon-sticky-cta', onSticky)
  }, [pathname])

  const scrollUp = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Hide while the pigeon mid-page sticky CTA is up so controls never stack.
  if (!visible || hideForPigeonSticky) return null

  return (
    <button
      type="button"
      onClick={scrollUp}
      className="back-to-top enter"
      aria-label="Back to top"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  )
}
