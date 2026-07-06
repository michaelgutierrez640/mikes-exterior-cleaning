import { SERVICE_TRUST_BADGES } from '../../config/servicePageEnhancements'
import ScrollReveal from '../ScrollReveal'

const ICONS = {
  licensed: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
  ),
  insured: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
  ),
  guarantee: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
  ),
  local: (
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  ),
}

export default function ServiceTrustBadges({ variant = 'light' }) {
  const isDark = variant === 'dark'

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {SERVICE_TRUST_BADGES.map((badge, i) => (
        <ScrollReveal key={badge.id} stagger={i + 1}>
          <div
            className={`flex h-full flex-col items-center rounded-[1rem] border px-4 py-5 text-center sm:px-5 sm:py-6 ${
              isDark
                ? 'border-white/[0.08] bg-white/[0.04]'
                : 'border-black/[0.04] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
            }`}
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                isDark ? 'bg-royal-500/20 text-royal-300' : 'bg-royal-50 text-royal-600'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                {ICONS[badge.id]}
              </svg>
            </div>
            <p className={`mt-3 text-[0.8125rem] font-bold tracking-wide uppercase sm:text-xs ${isDark ? 'text-white' : 'text-navy-900'}`}>
              {badge.label}
            </p>
            <p className={`mt-1.5 text-[0.75rem] leading-snug sm:text-[0.8125rem] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {badge.description}
            </p>
          </div>
        </ScrollReveal>
      ))}
    </div>
  )
}
