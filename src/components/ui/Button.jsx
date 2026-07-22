import { Link, useLocation } from 'react-router-dom'
import { BUSINESS } from '../../config/business'
import { scrollToContact } from '../../utils/scroll'
import { trackInternalEvent, trackPhoneClick } from '../../utils/analytics'

const sizes = {
  sm: 'btn-sm',
  md: 'btn-md',
}

/** Shared tap-to-call anchor with phone_clicked tracking. */
export function PhoneLink({
  className = '',
  sourceHint = 'phone_link',
  children,
  onClick,
  ...rest
}) {
  return (
    <a
      href={BUSINESS.phoneHref}
      className={className}
      onClick={(e) => {
        trackPhoneClick(sourceHint)
        onClick?.(e)
      }}
      {...rest}
    >
      {children ?? BUSINESS.phone}
    </a>
  )
}

export function CallButton({
  className = '',
  variant = 'primary',
  size = 'md',
  children = 'Call Now',
  showIcon = true,
  sourceHint = 'call_button',
}) {
  const v = { primary: 'btn-primary', secondary: 'btn-secondary', royal: 'btn-royal', nav: 'btn-nav' }[variant] || 'btn-primary'
  return (
    <PhoneLink sourceHint={sourceHint} className={`${v} ${sizes[size]} ${className}`}>
      {showIcon && (
        <svg className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
        </svg>
      )}
      {children}
    </PhoneLink>
  )
}

export function InstantQuoteButton({ className = '', variant = 'royal', size = 'md', children = 'Get Instant Quote', showIcon = true }) {
  const v = { primary: 'btn-primary', secondary: 'btn-secondary', royal: 'btn-royal', nav: 'btn-nav' }[variant] || 'btn-royal'
  return (
    <Link
      to="/instant-quote"
      className={`group ${v} ${sizes[size]} ${className}`}
    >
      {children}
      {showIcon && (
        <svg className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-90 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Z" />
        </svg>
      )}
    </Link>
  )
}

export function BookOnlineButton({ className = '', variant = 'royal', size = 'md', children = 'Book Online', showIcon = true, state = undefined }) {
  const v = { primary: 'btn-primary', secondary: 'btn-secondary', royal: 'btn-royal', nav: 'btn-nav' }[variant] || 'btn-royal'
  return (
    <Link
      to="/book-online"
      state={state}
      className={`group ${v} ${sizes[size]} ${className}`}
      onClick={() => trackInternalEvent('book_online_clicked', { sourceHint: 'book_online_button' })}
    >
      {children}
      {showIcon && (
        <svg className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-90 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      )}
    </Link>
  )
}

export function QuoteButton({ className = '', variant = 'secondary', size = 'md', children = 'Get Free Quote', showIcon = true }) {
  const v = { primary: 'btn-primary', secondary: 'btn-secondary', royal: 'btn-royal', nav: 'btn-nav' }[variant] || 'btn-secondary'
  const { pathname } = useLocation()
  const onHome = pathname === '/'

  if (onHome) {
    return (
      <a href="#contact" onClick={scrollToContact} className={`group ${v} ${sizes[size]} ${className}`}>
        {children}
        {showIcon && (
          <svg className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-90 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        )}
      </a>
    )
  }

  return (
    <Link to="/#contact" className={`group ${v} ${sizes[size]} ${className}`}>
      {children}
      {showIcon && (
        <svg className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-90 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      )}
    </Link>
  )
}
