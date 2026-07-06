import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Header from './Header'
import Footer from './Footer'
import MobileCTA from './MobileCTA'
import BackToTop from '../ui/BackToTop'

/** Shared shell for all routed pages (home uses its own full layout). */
export default function Layout() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-600">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Header />
      <main id="main-content" className="relative z-[1]">
        <Outlet />
      </main>
      <Footer />
      <MobileCTA />
      <BackToTop />
    </div>
  )
}
