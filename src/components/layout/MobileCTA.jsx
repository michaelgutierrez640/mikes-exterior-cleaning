import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CallButton } from '../ui/Button'
import {
  trackPigeonGuardCallClicked,
  trackPigeonGuardEstimateClicked,
} from '../../utils/analytics'
import { scrollToPigeonEstimateForm } from '../../utils/scroll'

function isPigeonGuardRoute(pathname) {
  return pathname === '/services/pigeon-guard' || pathname.startsWith('/services/pigeon-guard/')
}

function isPigeonLanding(pathname) {
  return pathname === '/services/pigeon-guard'
}

function useElementInView(selector, { rootMargin = '0px', enabled = true, initial = false } = {}) {
  const [inView, setInView] = useState(initial)

  useEffect(() => {
    if (!enabled) {
      setInView(false)
      return undefined
    }

    setInView(initial)
    let observer
    let cancelled = false
    let raf = 0

    const attach = () => {
      const el = document.querySelector(selector)
      if (!el) {
        // Form/hero may mount a tick later on route enter
        if (!cancelled) raf = requestAnimationFrame(attach)
        return
      }
      observer = new IntersectionObserver(
        ([entry]) => {
          setInView(Boolean(entry?.isIntersecting))
        },
        { root: null, threshold: 0.05, rootMargin },
      )
      observer.observe(el)
    }

    attach()
    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [selector, rootMargin, enabled, initial])

  return inView
}

export default function MobileCTA() {
  const { pathname } = useLocation()
  const pigeon = isPigeonGuardRoute(pathname)
  const pigeonLanding = isPigeonLanding(pathname)

  const heroCtasInView = useElementInView('#pigeon-hero-ctas', {
    enabled: pigeonLanding,
    initial: true,
  })
  const submitInView = useElementInView('#pg-submit', {
    enabled: pigeonLanding,
    initial: false,
    // Count submit as visible a bit before it reaches the bottom bar
    rootMargin: '0px 0px -12% 0px',
  })

  const showPigeonSticky = pigeonLanding ? !heroCtasInView && !submitInView : pigeon

  useEffect(() => {
    const visible = Boolean(showPigeonSticky && pigeonLanding)
    document.documentElement.classList.toggle('pigeon-mid-sticky-cta', visible)
    window.dispatchEvent(new CustomEvent('pigeon-sticky-cta', { detail: { visible } }))
    return () => {
      document.documentElement.classList.remove('pigeon-mid-sticky-cta')
      window.dispatchEvent(new CustomEvent('pigeon-sticky-cta', { detail: { visible: false } }))
    }
  }, [showPigeonSticky, pigeonLanding])

  // On the pigeon landing page, hide sticky while hero CTAs or form submit are on screen.
  if (pigeonLanding && !showPigeonSticky) {
    return null
  }

  const compact = pigeon

  return (
    <div
      className={[
        'fixed right-0 bottom-0 left-0 z-50 border-t border-white/[0.06] bg-navy-950/92 backdrop-blur-2xl lg:hidden',
        compact ? 'px-3 pt-1.5' : 'px-5 pt-3',
      ].join(' ')}
      style={{
        paddingBottom: compact
          ? 'max(0.35rem, env(safe-area-inset-bottom))'
          : 'max(0.75rem, env(safe-area-inset-bottom))',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.04), 0 -8px 32px rgba(0,0,0,0.2)',
      }}
      role="complementary"
      aria-label="Quick contact actions"
      data-pigeon-sticky={compact ? 'true' : undefined}
    >
      <div className={['mx-auto flex max-w-md', compact ? 'gap-2' : 'gap-2.5'].join(' ')}>
        <CallButton
          variant="primary"
          size="sm"
          className={
            compact
              ? 'flex-1 !min-h-11 !rounded-lg !px-3 !py-2 !text-[0.875rem]'
              : 'flex-1 !rounded-xl !py-3.5'
          }
          showIcon={false}
          sourceHint={compact ? 'pigeon_guard_sticky_call' : 'mobile_cta_call'}
          onClick={
            compact
              ? () => trackPigeonGuardCallClicked('pigeon_guard_sticky_call')
              : undefined
          }
        >
          {compact ? 'Call' : 'Call Now'}
        </CallButton>
        {pigeon ? (
          pathname === '/services/pigeon-guard' ? (
            <a
              href="#estimate-form"
              onClick={(e) => {
                trackPigeonGuardEstimateClicked('pigeon_guard_sticky_estimate')
                scrollToPigeonEstimateForm(e)
              }}
              className={
                compact
                  ? 'btn-royal btn-sm flex-1 !min-h-11 !rounded-lg !px-3 !py-2 !text-[0.875rem]'
                  : 'btn-royal btn-sm flex-1 !rounded-xl !py-3.5'
              }
            >
              {compact ? 'Free Estimate' : 'Get Pigeon Guard Estimate'}
            </a>
          ) : (
            <Link
              to="/services/pigeon-guard#estimate-form"
              onClick={() => trackPigeonGuardEstimateClicked('pigeon_guard_sticky_estimate_nav')}
              className={
                compact
                  ? 'btn-royal btn-sm flex-1 !min-h-11 !rounded-lg !px-3 !py-2 !text-[0.875rem]'
                  : 'btn-royal btn-sm flex-1 !rounded-xl !py-3.5'
              }
            >
              {compact ? 'Free Estimate' : 'Get Pigeon Guard Estimate'}
            </Link>
          )
        ) : (
          <Link to="/instant-quote" className="btn-royal btn-sm flex-1 !rounded-xl !py-3.5">
            Instant Quote
          </Link>
        )}
      </div>
    </div>
  )
}
