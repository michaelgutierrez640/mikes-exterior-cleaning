import { CallButton, InstantQuoteButton } from '../ui/Button'

export default function MobileCTA() {
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
        <InstantQuoteButton variant="royal" size="sm" className="flex-1 !rounded-xl !py-3.5" showIcon={false}>
          Instant Quote
        </InstantQuoteButton>
      </div>
    </div>
  )
}
