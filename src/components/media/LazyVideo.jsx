import { useEffect, useRef, useState } from 'react'

/**
 * Viewport-lazy HTML5 video: no autoplay-with-sound, native controls, playsInline.
 * Poster keeps LCP cheap; src attaches only when near the viewport.
 */
export default function LazyVideo({
  src,
  poster = '',
  contentType = '',
  alt = '',
  className = '',
  preload = 'none',
}) {
  const ref = useRef(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || active) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setActive(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
          setActive(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px 0px', threshold: 0.01 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [active])

  return (
    <video
      ref={ref}
      className={className}
      controls
      playsInline
      muted={false}
      autoPlay={false}
      preload={active ? preload : 'none'}
      poster={poster || undefined}
      aria-label={alt || 'Project video'}
    >
      {active && src ? (
        contentType ? (
          <source src={src} type={contentType} />
        ) : (
          <source src={src} />
        )
      ) : null}
      Your browser cannot play this video. Try opening it on your phone or use an MP4 (H.264) export.
    </video>
  )
}
