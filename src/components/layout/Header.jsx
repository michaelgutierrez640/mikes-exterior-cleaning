import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BUSINESS, NAV_LINKS } from '../../config/business'
import { LogoMark } from '../ui/Icons'
import { QuoteButton } from '../ui/Button'

function NavLink({ href, children, onClick, mobile = false }) {
  const isRoute = href.startsWith('/') && !href.includes('#')
  const desktopClass = 'nav-link'
  const mobileClass =
    'block border-b border-white/[0.06] py-4 text-[1.0625rem] font-medium tracking-[-0.01em] text-white/90 transition-colors active:text-white'
  const className = mobile ? mobileClass : desktopClass

  if (isRoute) {
    return (
      <Link to={href} onClick={onClick} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  )
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="fixed top-0 right-0 left-0 z-50">
      <div
        className={`transition-[background-color,box-shadow,border-color] duration-500 ${
          scrolled
            ? 'border-b border-white/[0.06] bg-navy-950/80 backdrop-blur-2xl'
            : 'bg-transparent'
        }`}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          boxShadow: scrolled ? '0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.18)' : 'none',
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 sm:px-10 lg:px-12">
          <Link to="/" className="group flex min-w-0 items-center gap-3" aria-label={`${BUSINESS.name} home`}>
            <div className="icon-wrap-royal transition-transform duration-300 group-hover:scale-[1.03]">
              <LogoMark />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="font-display text-[1.0625rem] font-semibold leading-tight text-white">{BUSINESS.shortName}</p>
              <p className="text-[10px] font-medium tracking-[0.2em] text-white/50 uppercase">{BUSINESS.tagline}</p>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-1 py-1 backdrop-blur-2xl lg:flex"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href}>{link.label}</NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <a
              href={BUSINESS.phoneHref}
              className="flex items-center gap-2 text-[0.8125rem] font-medium text-white/75 transition-colors duration-300 hover:text-white"
            >
              <svg className="h-4 w-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
              </svg>
              <span className="hidden xl:inline">{BUSINESS.phone}</span>
              <span className="xl:hidden">Call</span>
            </a>
            <QuoteButton variant="nav" size="sm" showIcon={false}>Get Free Quote</QuoteButton>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-white backdrop-blur-xl transition-all duration-300 active:scale-95 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <svg className="h-[1.125rem] w-[1.125rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-0 top-[calc(3.25rem+env(safe-area-inset-top))] z-40 overflow-y-auto bg-navy-950/96 px-6 py-8 backdrop-blur-3xl lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <nav className="mx-auto flex max-w-md flex-col" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href} onClick={closeMenu} mobile>
                {link.label}
              </NavLink>
            ))}
            <div className="mt-8 flex flex-col gap-3">
              <a href={BUSINESS.phoneHref} className="btn-secondary btn-md rounded-2xl text-center">
                Call {BUSINESS.phone}
              </a>
              <QuoteButton variant="primary" size="md" className="rounded-2xl text-center justify-center" showIcon={false} />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
