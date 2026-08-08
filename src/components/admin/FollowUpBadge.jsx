import { FOLLOW_UP_BADGE_LABELS } from './leadHelpers'

/**
 * Compact follow-up urgency chip.
 * Hides "none" and cleared follow-ups ("completed") so they are not confused
 * with lead pipeline status Completed.
 */
export default function FollowUpBadge({ badge }) {
  if (!badge || badge === 'none' || badge === 'completed') return null

  const styles = {
    overdue: 'bg-red-50 text-red-700',
    today: 'bg-amber-50 text-amber-800',
    upcoming: 'bg-sky-50 text-sky-800',
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold ${styles[badge] || 'bg-gray-100 text-gray-600'}`}
    >
      {FOLLOW_UP_BADGE_LABELS[badge] || badge}
    </span>
  )
}
