import { useEffect } from 'react'

/**
 * Lightweight fixed toast for Admin CRM actions (no page jump).
 * @param {{ toast: null | { id: number, message: string, tone?: 'success' | 'error' }, onDismiss: () => void }} props
 */
export default function AdminToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => onDismiss?.(), 3200)
    return () => window.clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast?.message) return null

  const tone = toast.tone === 'error' ? 'error' : 'success'
  const classes =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-900'
      : 'border-emerald-200 bg-emerald-50 text-emerald-900'

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center p-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:justify-end sm:p-0"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        role={tone === 'error' ? 'alert' : 'status'}
        className={[
          'pointer-events-auto max-w-sm rounded-xl border px-4 py-3 text-[0.875rem] font-medium shadow-lg',
          classes,
        ].join(' ')}
      >
        {toast.message}
      </div>
    </div>
  )
}
