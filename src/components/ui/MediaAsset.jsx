import { useEffect, useState } from 'react'
import ResponsiveImage from './ResponsiveImage'

export default function MediaAsset({
  src,
  webp,
  srcSet,
  alt,
  label,
  file,
  sizeHint,
  className = '',
  priority = false,
  aspectRatio,
  variant = 'light',
  type = 'image',
  poster,
  onClick,
  showPlaceholder = true,
  compact = false,
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setFailed(false)

    if (type === 'video') {
      fetch(src, { method: 'HEAD' })
        .then((res) => { if (res.ok) setLoaded(true); else setFailed(true) })
        .catch(() => setFailed(true))
      return
    }

    const img = new Image()
    img.onload = () => setLoaded(true)
    img.onerror = () => setFailed(true)
    img.src = webp || src
  }, [src, webp, type])

  if (type === 'video' && loaded && !failed) {
    return (
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        className={className}
        style={aspectRatio ? { aspectRatio } : undefined}
        aria-label={alt}
      />
    )
  }

  if (type === 'image' && loaded && !failed) {
    return (
      <ResponsiveImage
        src={src}
        webp={webp}
        srcSet={srcSet}
        alt={alt}
        className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onClick={onClick}
        sizes={priority ? '200px' : '(max-width: 640px) 100vw, 400px'}
      />
    )
  }

  if (!showPlaceholder) {
    return (
      <div
        className={`animate-pulse bg-gradient-to-br from-navy-800 to-navy-700 ${className}`}
        style={{ aspectRatio: aspectRatio || '16/9' }}
        aria-hidden="true"
      />
    )
  }

  return (
    <ImagePlaceholder
      title={label || alt}
      file={file}
      sizeHint={sizeHint}
      className={className}
      aspectRatio={aspectRatio || '16/9'}
      variant={variant}
      type={type}
      compact={compact}
    />
  )
}

function PlaceholderIcon({ type, className = 'h-5 w-5' }) {
  if (type === 'video') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    )
  }

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
    </svg>
  )
}

export function ImagePlaceholder({
  title,
  file,
  sizeHint,
  className = '',
  aspectRatio = '16/9',
  variant = 'light',
  type = 'image',
  compact = false,
  layout = 'default',
}) {
  const isDark = variant === 'dark'
  const typeLabel = type === 'video' ? 'Video needed' : 'Photo needed'
  const heading = title ? `${title}` : typeLabel

  if (layout === 'hero') {
    return (
      <div
        className="absolute inset-0 z-[1] flex items-end justify-end p-6 sm:p-8 lg:p-10"
        aria-hidden="true"
      >
        <div className="max-w-sm rounded-2xl border border-white/15 bg-navy-950/80 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-600/25 text-royal-300">
              <PlaceholderIcon type="image" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.2em] text-royal-400 uppercase">Image slot</p>
              <p className="mt-1 font-display text-base font-semibold text-white">{heading}</p>
            </div>
          </div>
          <p className="mt-4 text-xs font-medium text-white/50">Add image here:</p>
          <p className="mt-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] leading-snug break-all text-royal-200">
            {file}
          </p>
          {sizeHint && (
            <p className="mt-3 text-xs leading-relaxed text-white/45">
              <span className="font-semibold text-white/60">Recommended:</span> {sizeHint}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-1.5 p-2 text-center ${className} ${
          isDark
            ? 'bg-gradient-to-br from-navy-800 to-navy-900 ring-1 ring-white/10'
            : 'bg-gradient-to-br from-gray-50 to-royal-50/50 ring-1 ring-royal-100'
        }`}
        style={{ aspectRatio }}
        role="img"
        aria-label={`${heading}. Add file at ${file}`}
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-white/10 text-royal-300' : 'bg-royal-100 text-royal-600'}`}>
          <PlaceholderIcon type={type} className="h-4 w-4" />
        </div>
        <p className={`text-[9px] font-bold tracking-wide uppercase ${isDark ? 'text-white/55' : 'text-gray-500'}`}>
          {type === 'video' ? 'Video' : 'Photo'}
        </p>
      </div>
    )
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden p-5 text-center sm:p-6 ${className} ${
        isDark
          ? 'bg-gradient-to-br from-navy-800 via-navy-800 to-navy-900 ring-1 ring-white/10'
          : 'bg-gradient-to-br from-white via-gray-50 to-royal-50/40 ring-1 ring-royal-100/80'
      }`}
      style={{ aspectRatio: aspectRatio === 'auto' ? undefined : aspectRatio }}
      role="img"
      aria-label={`${heading}. Add file at ${file}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 opacity-[0.35] ${
          isDark
            ? 'bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]'
            : 'bg-[linear-gradient(rgba(37,99,235,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.04)_1px,transparent_1px)] bg-[size:20px_20px]'
        }`}
        aria-hidden="true"
      />

      <div className="relative max-w-xs">
        <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${isDark ? 'bg-royal-600/20 text-royal-300' : 'bg-royal-100 text-royal-600'}`}>
          <PlaceholderIcon type={type} />
        </div>

        <p className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isDark ? 'text-royal-400' : 'text-royal-600'}`}>
          {type === 'video' ? 'Video slot' : 'Image slot'}
        </p>
        <p className={`mt-1.5 font-display text-sm font-semibold leading-snug sm:text-base ${isDark ? 'text-white' : 'text-navy-900'}`}>
          {heading}
        </p>

        <p className={`mt-4 text-xs font-medium ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Add image here:</p>
        <p className={`mt-1.5 rounded-lg border px-3 py-2 font-mono text-[10px] leading-snug break-all sm:text-[11px] ${
          isDark ? 'border-white/10 bg-white/5 text-royal-200' : 'border-royal-100 bg-white text-royal-700'
        }`}>
          {file}
        </p>

        {sizeHint && (
          <p className={`mt-3 text-[11px] leading-relaxed sm:text-xs ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
            <span className={`font-semibold ${isDark ? 'text-white/65' : 'text-gray-600'}`}>Recommended:</span>{' '}
            {sizeHint}
          </p>
        )}
      </div>
    </div>
  )
}
