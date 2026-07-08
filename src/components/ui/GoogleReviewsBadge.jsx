import { useGoogleReviewsBadgeLabel, useGoogleReviewsLink } from '../../context/GoogleReviewsContext'
import GoogleStars from './GoogleStars'
import { trackInternalEvent } from '../../utils/analytics'

const VARIANTS = {
  light:
    'border border-amber-400/25 bg-white text-navy-900 shadow-[0_1px_3px_rgba(10,22,40,0.06),0_8px_24px_rgba(10,22,40,0.04)]',
  dark:
    'border border-white/[0.1] bg-white/[0.06] text-white backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.12)]',
}

const SIZES = {
  sm: { stars: 'h-3 w-3', text: 'text-[0.6875rem]', padding: 'px-4 py-2.5', gap: 'gap-1' },
  md: { stars: 'h-3.5 w-3.5', text: 'text-[0.8125rem]', padding: 'px-5 py-3', gap: 'gap-1.5' },
}

export default function GoogleReviewsBadge({
  variant = 'light',
  size = 'md',
  className = '',
  link = false,
}) {
  const { stars, text, padding, gap } = SIZES[size]
  const reviewsUrl = useGoogleReviewsLink()
  const badgeLabel = useGoogleReviewsBadgeLabel()
  const isLink = link && reviewsUrl

  const content = (
    <>
      <GoogleStars className={stars} />
      <span className={`font-semibold tracking-[-0.01em] ${text}`}>
        {badgeLabel}
      </span>
    </>
  )

  const sharedClassName = [
    'inline-flex flex-col items-center rounded-2xl transition-[border-color,background-color,box-shadow] duration-300',
    VARIANTS[variant],
    padding,
    gap,
    isLink && variant === 'light' && 'hover:border-amber-400/40 hover:shadow-[0_2px_8px_rgba(10,22,40,0.08)]',
    isLink && variant === 'dark' && 'hover:border-white/[0.18] hover:bg-white/[0.09]',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (isLink) {
    return (
      <a
        href={reviewsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={sharedClassName}
        aria-label={`${badgeLabel} on Google`}
        onClick={() => trackInternalEvent('google_review_clicked', { sourceHint: 'reviews_badge' })}
      >
        {content}
      </a>
    )
  }

  return (
    <div className={sharedClassName} aria-label={badgeLabel}>
      {content}
    </div>
  )
}
