import { useScrollReveal } from '../hooks/useScrollReveal'

const DELAYS = ['', 'delay-75', 'delay-100', 'delay-150', 'delay-200', 'delay-300', 'delay-400', 'delay-500', 'delay-600']

export function staggerDelay(index) {
  return DELAYS[Math.min(index, DELAYS.length - 1)]
}

export default function ScrollReveal({
  children,
  className = '',
  animation = 'reveal',
  delay = '',
  stagger,
  once = true,
}) {
  const ref = useScrollReveal({ once })
  const delayClass = stagger !== undefined ? staggerDelay(stagger) : delay

  return (
    <div ref={ref} className={`${animation} ${delayClass} ${className}`}>
      {children}
    </div>
  )
}
