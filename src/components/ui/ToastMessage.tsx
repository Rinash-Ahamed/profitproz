'use client'

import { useEffect, useRef } from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'

type ToastTone = 'success' | 'error' | 'info'

export function ToastMessage({ message, tone, onDismiss, duration = 3000 }: {
  message: string
  tone: ToastTone
  onDismiss: () => void
  duration?: number
}) {
  const onDismissRef = useRef(onDismiss)
  useEffect(() => { onDismissRef.current = onDismiss }, [onDismiss])
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => onDismissRef.current(), duration)
    return () => window.clearTimeout(timer)
  }, [duration, message])

  if (!message) return null
  const styles = tone === 'error'
    ? 'border-red-500/35 bg-red-950/95 text-red-100'
    : tone === 'info'
      ? 'border-amber-500/35 bg-amber-950/95 text-amber-100'
      : 'border-[#66B159]/40 bg-zinc-900/95 text-ink'
  const Icon = tone === 'error' ? CircleAlert : tone === 'info' ? Info : CheckCircle2

  return (
    <div className={`fixed right-4 top-24 z-[250] flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-lg border px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur sm:right-6 ${styles}`} role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>
      <Icon className={`mt-0.5 h-5 w-5 flex-none ${tone === 'success' ? 'text-[#66B159]' : ''}`} />
      <p className="min-w-0 flex-1 text-sm leading-5">{message}</p>
      <button type="button" onClick={onDismiss} className="flex h-6 w-6 flex-none items-center justify-center rounded text-current/70 hover:bg-white/10 hover:text-current" aria-label="Dismiss notification"><X className="h-4 w-4" /></button>
    </div>
  )
}
