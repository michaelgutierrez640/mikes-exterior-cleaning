import { useCallback, useEffect, useRef, useState } from 'react'
import ResponsiveImage from './ui/ResponsiveImage'

function useImageStatus(src, webp) {
  const [status, setStatus] = useState(() => (src || webp ? 'loading' : 'error'))

  useEffect(() => {
    const target = webp || src
    if (!target) {
      setStatus('error')
      return
    }

    let cancelled = false
    setStatus('loading')
    const img = new Image()
    img.onload = () => {
      if (!cancelled) setStatus('ready')
    }
    img.onerror = () => {
      if (!cancelled) setStatus('error')
    }
    img.src = target

    return () => {
      cancelled = true
    }
  }, [src, webp])

  return status
}

function SlideImage({ src, webp, srcSet, alt, clipStyle }) {
  const content = (
    <ResponsiveImage
      src={src}
      webp={webp}
      srcSet={srcSet}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover"
      draggable={false}
      loading="lazy"
      sizes="(max-width: 1024px) 100vw, 50vw"
    />
  )

  if (clipStyle) {
    return (
      <div style={clipStyle} className="absolute inset-0 overflow-hidden">
        {content}
      </div>
    )
  }

  return <div className="absolute inset-0">{content}</div>
}

export default function BeforeAfterSlider({
  before,
  after,
  beforeWebp,
  afterWebp,
  beforeSrcSet,
  afterSrcSet,
  label,
  aspectClass = 'aspect-[16/10]',
  onValidityChange,
}) {
  const containerRef = useRef(null)
  const [position, setPosition] = useState(50)
  const targetPosition = useRef(50)
  const dragging = useRef(false)
  const rafId = useRef(null)

  const beforeStatus = useImageStatus(before, beforeWebp)
  const afterStatus = useImageStatus(after, afterWebp)
  const bothReady = beforeStatus === 'ready' && afterStatus === 'ready'
  const failed = beforeStatus === 'error' || afterStatus === 'error'
  const onValidityChangeRef = useRef(onValidityChange)
  onValidityChangeRef.current = onValidityChange

  useEffect(() => {
    if (failed) onValidityChangeRef.current?.(false)
    else if (bothReady) onValidityChangeRef.current?.(true)
  }, [failed, bothReady])

  const animate = useCallback(() => {
    setPosition((prev) => {
      const diff = targetPosition.current - prev
      if (Math.abs(diff) < 0.1) return targetPosition.current
      return prev + diff * 0.18
    })
    rafId.current = requestAnimationFrame(animate)
  }, [])

  const startAnimate = useCallback(() => {
    if (!rafId.current) rafId.current = requestAnimationFrame(animate)
  }, [animate])

  const stopAnimate = useCallback(() => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
      rafId.current = null
    }
  }, [])

  useEffect(() => () => stopAnimate(), [stopAnimate])

  const updateTarget = useCallback(
    (clientX) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
      targetPosition.current = (x / rect.width) * 100
      startAnimate()
    },
    [startAnimate],
  )

  const onPointerDown = (e) => {
    dragging.current = true
    containerRef.current?.setPointerCapture(e.pointerId)
    updateTarget(e.clientX)
  }

  const onPointerMove = (e) => {
    if (dragging.current) updateTarget(e.clientX)
  }

  const onPointerUp = () => {
    dragging.current = false
    setTimeout(stopAnimate, 300)
  }

  if (failed) return null

  if (!bothReady) {
    return (
      <div className="group" aria-hidden="true">
        {label && (
          <p className="mb-4 text-center text-[11px] font-semibold tracking-[0.2em] text-white/45 uppercase">
            {label}
          </p>
        )}
        <div
          className={`relative ${aspectClass} animate-pulse overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-navy-800 to-navy-700 ring-1 ring-white/[0.08]`}
        />
      </div>
    )
  }

  return (
    <div className="group">
      {label && (
        <p className="mb-4 text-center text-[11px] font-semibold tracking-[0.2em] text-white/45 uppercase">
          {label}
        </p>
      )}
      <div
        ref={containerRef}
        className={`relative ${aspectClass} cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-[1.25rem] shadow-[0_8px_40px_rgba(0,0,0,0.25)] ring-1 ring-white/[0.08]`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={`${label || 'Before and after'} comparison slider`}
      >
        <SlideImage src={after} webp={afterWebp} srcSet={afterSrcSet} alt="After cleaning" />
        <SlideImage
          src={before}
          webp={beforeWebp}
          srcSet={beforeSrcSet}
          alt="Before cleaning"
          clipStyle={{ clipPath: `inset(0 ${100 - position}% 0 0)`, position: 'absolute', inset: 0 }}
        />

        <div
          className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-white/90 shadow-lg transition-shadow"
          style={{ left: `${position}%` }}
          aria-hidden="true"
        >
          <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.04] transition-transform duration-300 group-hover:scale-105">
            <svg className="h-4 w-4 text-navy-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 9m0 0 3.75 6M12 9l3.75-6M12 15l-3.75 6" />
            </svg>
          </div>
        </div>

        <span className="absolute top-4 left-4 z-20 rounded-full bg-black/50 px-3 py-1.5 text-xs font-bold tracking-wider text-white uppercase backdrop-blur-md">
          Before
        </span>
        <span className="absolute top-4 right-4 z-20 rounded-full bg-royal-600/90 px-3 py-1.5 text-xs font-bold tracking-wider text-white uppercase backdrop-blur-md">
          After
        </span>
      </div>
    </div>
  )
}
