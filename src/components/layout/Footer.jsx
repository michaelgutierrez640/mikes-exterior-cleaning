import { Link } from 'react-router-dom'
import { BUSINESS, NAV_LINKS, getBusinessNapLine } from '../../config/business'
import { useGoogleReviewsLink } from '../../context/GoogleReviewsContext'
import { SERVICE_CITIES } from '../../config/serviceAreas'
import { LogoMark } from '../ui/Icons'
import GoogleReviewsBadge from '../ui/GoogleReviewsBadge'

function FooterLink({ href, children }) {
  const isRoute = href.startsWith('/') && !href.includes('#')
  const className = 'text-[0.8125rem] text-white/45 transition-colors duration-300 hover:text-white/80'

  if (isRoute) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

function SocialIcon({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/50 transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white"
    >
      {children}
    </a>
  )
}

export default function Footer() {
  const reviewsLink = useGoogleReviewsLink()

  return (
    <footer className="relative border-t border-white/[0.05] bg-navy-950">
      <div className="section-container py-16 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <div className="icon-wrap-royal">
                <LogoMark />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-white">{BUSINESS.shortName}</p>
                <p className="text-[10px] font-medium tracking-[0.2em] text-white/40 uppercase">{BUSINESS.tagline}</p>
              </div>
            </div>
            <p className="mt-5 max-w-xs text-[0.8125rem] leading-[1.65] text-white/40">
              {BUSINESS.description}
            </p>
            <div className="mt-5">
              <GoogleReviewsBadge variant="dark" size="sm" link />
            </div>
          </div>

          <div className="lg:col-span-2">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-400 uppercase">Quick Links</p>
            <nav className="mt-5 flex flex-col gap-3" aria-label="Footer navigation">
              {NAV_LINKS.map((link) => (
                <FooterLink key={link.href} href={link.href}>{link.label}</FooterLink>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-3">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-400 uppercase">Contact</p>
            <div className="mt-5 space-y-3">
              <a href={BUSINESS.phoneHref} className="block text-[0.9375rem] font-semibold text-white/75 transition-colors hover:text-white">
                {BUSINESS.phone}
              </a>
              <a href={BUSINESS.emailHref} className="block break-all text-[0.8125rem] text-white/45 transition-colors hover:text-white/75">
                {BUSINESS.email}
              </a>
              <p className="pt-2 text-[0.8125rem] leading-relaxed text-white/45">
                {getBusinessNapLine()}
                <br />
                <span className="text-white/35">{BUSINESS.serviceAreaLabel}</span>
              </p>
            </div>
          </div>

          <div className="lg:col-span-3">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-400 uppercase">Business Hours</p>
            <ul className="mt-5 space-y-2.5 text-[0.8125rem] text-white/45">
              {BUSINESS.hours.map((h) => (
                <li key={h.days}>
                  <span className="font-medium text-white/65">{h.days}</span>
                  <br />
                  {h.time}
                </li>
              ))}
            </ul>
            <p className="mt-7 text-[10px] font-semibold tracking-[0.2em] text-royal-400 uppercase">Service Areas</p>
            <nav className="mt-3 flex flex-wrap gap-x-3 gap-y-2" aria-label="Footer service areas">
              {SERVICE_CITIES.map((city) => (
                <Link
                  key={city.slug}
                  to={`/service-areas/${city.slug}`}
                  className="text-[0.8125rem] text-white/45 transition-colors hover:text-white/75"
                >
                  {city.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-5 border-t border-white/[0.05] pt-8 sm:flex-row">
          <p className="text-center text-[0.75rem] text-white/30 sm:text-left">
            &copy; {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
          </p>
          {(reviewsLink || BUSINESS.social.facebook || BUSINESS.social.instagram) && (
            <div className="flex items-center gap-2.5">
              {reviewsLink && (
                <SocialIcon href={reviewsLink} label="Google Reviews">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /></svg>
                </SocialIcon>
              )}
              {BUSINESS.social.facebook && (
                <SocialIcon href={BUSINESS.social.facebook} label="Facebook">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </SocialIcon>
              )}
              {BUSINESS.social.instagram && (
                <SocialIcon href={BUSINESS.social.instagram} label="Instagram">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
                </SocialIcon>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
