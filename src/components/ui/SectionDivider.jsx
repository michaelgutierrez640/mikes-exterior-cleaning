const FILLS = {
  white: '#ffffff',
  gray: '#f9fafb',
  reviews: '#f9fafb',
  navy: '#0a1628',
  faq: '#f6f7f9',
  map: '#f1f5f9',
  areas: '#ffffff',
}

export default function SectionDivider({ from = 'white', to = 'gray' }) {
  const fromFill = FILLS[from] || from
  const toFill = FILLS[to] || to
  const id = `div-${from}-${to}`

  return (
    <div className="section-divider" aria-hidden="true">
      <svg viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none" className="h-6 w-full sm:h-8">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fromFill} />
            <stop offset="100%" stopColor={toFill} />
          </linearGradient>
        </defs>
        <path
          d="M0,40 L0,20 Q360,4 720,16 T1440,12 L1440,40 Z"
          fill={`url(#${id})`}
        />
      </svg>
    </div>
  )
}
