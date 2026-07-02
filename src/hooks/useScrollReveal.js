import { useEffect, useRef } from 'react'

export function useScrollReveal(options = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          if (options.once !== false) observer.unobserve(el)
        } else if (!options.once) {
          el.classList.remove('visible')
        }
      },
      { threshold: options.threshold ?? 0.15, rootMargin: options.rootMargin ?? '0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [options.once, options.threshold, options.rootMargin])

  return ref
}
