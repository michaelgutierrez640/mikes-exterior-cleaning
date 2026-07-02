import { HERO_TRUST_BADGES } from '../../config/business'
import GoogleReviewsBadge from './GoogleReviewsBadge'

export default function TrustBar() {
  return (
    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3" role="list" aria-label="Trust indicators">
      <GoogleReviewsBadge variant="dark" size="sm" link />
      {HERO_TRUST_BADGES.map((signal) => (
        <span key={signal.id} role="listitem" className="pill-dark">
          {signal.label}
        </span>
      ))}
    </div>
  )
}
