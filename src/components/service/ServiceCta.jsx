import { CallButton, QuoteButton } from '../ui/Button'
import ScrollReveal from '../ScrollReveal'

export default function ServiceCta({
  headline,
  text,
  variant = 'light',
  compact = false,
}) {
  const isDark = variant === 'dark'

  return (
    <div
      className={`rounded-[1.25rem] border text-center ${
        isDark
          ? 'border-white/[0.08] bg-navy-900/60 px-6 py-8 sm:px-10 sm:py-10'
          : 'border-royal-100/80 bg-gradient-to-br from-royal-50/80 via-white to-white px-6 py-8 shadow-[0_4px_24px_rgba(37,99,235,0.06)] sm:px-10 sm:py-10'
      } ${compact ? 'mt-10' : ''}`}
    >
      <ScrollReveal>
        <h3
          className={`font-display text-xl font-semibold sm:text-2xl ${
            isDark ? 'text-white' : 'text-navy-900'
          }`}
        >
          {headline}
        </h3>
        {text && (
          <p
            className={`mx-auto mt-3 max-w-lg text-[0.9375rem] leading-[1.7] sm:text-base ${
              isDark ? 'text-white/60' : 'text-gray-600'
            }`}
          >
            {text}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <QuoteButton variant={isDark ? 'primary' : 'primary'} />
          <CallButton variant={isDark ? 'secondary' : 'secondary'} />
        </div>
      </ScrollReveal>
    </div>
  )
}
