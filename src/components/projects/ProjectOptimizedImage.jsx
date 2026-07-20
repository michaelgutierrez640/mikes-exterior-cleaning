import { useCallback, useEffect, useRef, useState } from 'react'
import { getProjectImageSources } from '../../utils/projectImageSrc'

const MAX_RETRIES = 2

/**
 * Optimized project photo with reserved aspect ratio, blur/skeleton preview,
 * lazy loading, and graceful retry/error UI.
 */
export default function ProjectOptimizedImage({
  photo,
  role = 'card',
  alt = '',
  className = '',
  imgClassName = 'h-full w-full object-cover',
  sizes,
  priority = false,
  aspectRatio: aspectRatioProp,
  onClick,
}) {
  const sources = getProjectImageSources(photo, role, { sizes })
  const [status, setStatus] = useState('loading')
  const [attempt, setAttempt] = useState(0)
  const retryTimer = useRef(null)

  useEffect(() => {
    setStatus('loading')
    setAttempt(0)
  }, [sources?.src, sources?.srcSet])

  useEffect(() => () => {
    if (retryTimer.current) clearTimeout(retryTimer.current)
  }, [])

  const onLoad = useCallback(() => setStatus('ready'), [])

  const onError = useCallback(() => {
    if (attempt < MAX_RETRIES) {
      setStatus('retrying')
      retryTimer.current = setTimeout(() => {
        setAttempt((n) => n + 1)
        setStatus('loading')
      }, 600 * (attempt + 1))
      return
    }
    setStatus('error')
  }, [attempt])

  if (!sources?.src) {
    return (
      <div
        className={`flex items-center justify-center bg-navy-950/5 text-[0.8125rem] text-gray-400 ${className}`}
        style={aspectRatioProp ? { aspectRatio: aspectRatioProp } : undefined}
      >
        No photo
      </div>
    )
  }

  const aspectRatio = aspectRatioProp || sources.aspectRatio || undefined
  const cacheBust = attempt > 0 ? `${sources.src.includes('?') ? '&' : '?'}retry=${attempt}` : ''
  const src = `${sources.src}${cacheBust}`

  return (
    <div
      className={`relative overflow-hidden bg-navy-950/[0.06] ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {sources.blurDataUrl && status !== 'ready' && (
        <img
          src={sources.blurDataUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
          draggable={false}
        />
      )}

      {status !== 'ready' && !sources.blurDataUrl && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-navy-100 via-gray-100 to-navy-50" aria-hidden="true" />
      )}

      {status !== 'error' && (
        <img
          key={`${src}-${attempt}`}
          src={src}
          srcSet={sources.srcSet}
          sizes={sources.sizes}
          alt={alt}
          className={`${imgClassName} relative z-[1] transition-opacity duration-300 ${
            status === 'ready' ? 'opacity-100' : 'opacity-0'
          }`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={onLoad}
          onError={onError}
          onClick={onClick}
          draggable={false}
        />
      )}

      {status === 'retrying' && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-navy-950/10">
          <p className="rounded-full bg-white/90 px-3 py-1 text-[0.75rem] font-medium text-navy-800 shadow">
            Retrying…
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-2 bg-navy-950/5 px-4 text-center">
          <p className="text-[0.8125rem] font-medium text-navy-800">Photo unavailable</p>
          <button
            type="button"
            className="rounded-full bg-royal-600 px-3 py-1.5 text-[0.75rem] font-semibold text-white"
            onClick={() => {
              setAttempt(0)
              setStatus('loading')
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
