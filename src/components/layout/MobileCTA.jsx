import { Link, useLocation } from 'react-router-dom'
import { CallButton } from '../ui/Button'
import { scrollToPigeonEstimateForm } from '../../utils/scroll'

function isPigeonGuardRoute(pathname) {
  return pathname === '/services/pigeon-guard' || pathname.startsWith('/services/pigeon-guard/')
}

export default function MobileCTA() {
  const { pathname } = useLocation()
  const pigeon = isPigeonGuardRoute(pathname)

  return (
    <div
      className="fixed right-0 bottom-0 left-0 z-50 border-t border-white/[0.06] bg-navy-950/88 px-5 pt-3 backdrop-blur-2xl lg:hidden"
      style={{
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.04), 0 -8px 32px rgba(0,0,0,0.2)',
      }}
      role="complementary"
      aria-label="Quick contact actions"
    >
      <div className="mx-auto flex max-w-md gap-2.5">
        <CallButton variant="primary" size="sm" className="flex-1 !rounded-xl !py-3.5" showIcon={false}>
          Call Now
        </CallButton>
        {pigeon ? (
          pathname === '/services/pigeon-guard' ? (
            <a
              href="#estimate-form"
              onClick={scrollToPigeonEstimateForm}
              className="btn-royal btn-sm flex-1 !rounded-xl !py-3.5"
            >
              Get Pigeon Guard Estimate
            </a>
          ) : (
            <Link
              to="/services/pigeon-guard#estimate-form"
              className="btn-royal btn-sm flex-1 !rounded-xl !py-3.5"
            >
              Get Pigeon Guard Estimate
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
