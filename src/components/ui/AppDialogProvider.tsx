'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, Copy, ShieldAlert, X } from 'lucide-react'

type DialogTone = 'default' | 'warning' | 'danger'
type DialogOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string | null
  tone?: DialogTone
}
type PromptOptions = DialogOptions & {
  label?: string
  initialValue?: string
  readOnly?: boolean
  copyable?: boolean
}
type ActiveDialog = (DialogOptions & { mode: 'confirm'; resolve: (value: boolean) => void }) | (PromptOptions & { mode: 'prompt'; resolve: (value: string | null) => void })
type AppDialogContextValue = {
  confirmAction: (options: DialogOptions) => Promise<boolean>
  promptAction: (options: PromptOptions) => Promise<string | null>
}

const AppDialogContext = createContext<AppDialogContextValue | null>(null)

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ActiveDialog | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const activeDialogRef = useRef<ActiveDialog | null>(null)

  const cancelActiveDialog = useCallback(() => {
    const active = activeDialogRef.current
    if (!active) return
    activeDialogRef.current = null
    if (active.mode === 'confirm') active.resolve(false)
    else active.resolve(null)
  }, [])

  const confirmAction = useCallback((options: DialogOptions) => new Promise<boolean>((resolve) => {
    cancelActiveDialog()
    setCopied(false)
    const nextDialog: ActiveDialog = { ...options, mode: 'confirm', resolve }
    activeDialogRef.current = nextDialog
    setDialog(nextDialog)
  }), [cancelActiveDialog])

  const promptAction = useCallback((options: PromptOptions) => new Promise<string | null>((resolve) => {
    cancelActiveDialog()
    setInputValue(options.initialValue || '')
    setCopied(false)
    const nextDialog: ActiveDialog = { ...options, mode: 'prompt', resolve }
    activeDialogRef.current = nextDialog
    setDialog(nextDialog)
  }), [cancelActiveDialog])

  const closeDialog = useCallback((confirmed: boolean) => {
    const active = activeDialogRef.current
    if (!active) return
    activeDialogRef.current = null
    setDialog(null)
    if (active.mode === 'confirm') active.resolve(confirmed)
    else active.resolve(confirmed ? inputValue : null)
  }, [inputValue])

  useEffect(() => () => cancelActiveDialog(), [cancelActiveDialog])

  useEffect(() => {
    if (!dialog) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [closeDialog, dialog])

  async function copyValue() {
    if (!inputValue) return
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(inputValue)
        setCopied(true)
        return
      } catch {
        // Fall back to selecting the value so it can be copied manually.
      }
    }
    inputRef.current?.focus()
    inputRef.current?.select()
  }

  const contextValue = useMemo(() => ({ confirmAction, promptAction }), [confirmAction, promptAction])

  const tone = dialog?.tone || 'default'
  const confirmClass = tone === 'danger'
    ? 'bg-red-500 text-white hover:bg-red-400'
    : tone === 'warning'
      ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
      : 'bg-[#66B159] text-white hover:bg-[#73bd66]'

  return (
    <AppDialogContext.Provider value={contextValue}>
      {children}
      {dialog ? (
        <div className="pwa-safe-modal fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-black/75 px-4 sm:items-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(false) }}>
          <div className="surface w-full max-w-md rounded-xl border border-zinc-700 shadow-2xl shadow-black/50" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message">
            <div className="flex items-start gap-4 border-b border-zinc-800 p-5">
              <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${tone === 'danger' ? 'bg-red-500/10 text-red-400' : tone === 'warning' ? 'bg-amber-500/10 text-amber-300' : 'bg-[#66B159]/10 text-[#66B159]'}`}>
                {tone === 'danger' ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1"><p id="app-dialog-title" className="text-lg font-semibold text-ink">{dialog.title}</p><p id="app-dialog-message" className="mt-2 text-sm leading-6 text-sub">{dialog.message}</p></div>
              <button type="button" onClick={() => closeDialog(false)} className="rounded-md p-1.5 text-sub hover:bg-zinc-800 hover:text-ink" aria-label="Close dialog"><X className="h-4 w-4" /></button>
            </div>

            {dialog.mode === 'prompt' ? (
              <div className="p-5 pb-0">
                {dialog.label ? <label htmlFor="app-dialog-input" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ghost">{dialog.label}</label> : null}
                <div className="flex items-start gap-2">
                  <textarea id="app-dialog-input" ref={inputRef} value={inputValue} readOnly={dialog.readOnly} onChange={(event) => setInputValue(event.target.value)} onFocus={(event) => { if (dialog.readOnly) event.currentTarget.select() }} rows={dialog.readOnly ? 2 : 3} className="min-h-20 flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-ink outline-none focus:border-[#66B159] read-only:text-[#66B159]" />
                  {dialog.copyable ? <button type="button" onClick={() => void copyValue()} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-xs font-semibold text-ink hover:bg-zinc-800">{copied ? <Check className="h-4 w-4 text-[#66B159]" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy'}</button> : null}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 p-5">
              {dialog.cancelLabel !== null ? <button type="button" onClick={() => closeDialog(false)} className="h-10 rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-sub hover:bg-zinc-800 hover:text-ink">{dialog.cancelLabel || 'Cancel'}</button> : null}
              <button type="button" onClick={() => closeDialog(true)} className={`h-10 rounded-lg px-4 text-sm font-semibold transition-colors ${confirmClass}`}>{dialog.confirmLabel || 'Confirm'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </AppDialogContext.Provider>
  )
}

export function useAppDialog() {
  const context = useContext(AppDialogContext)
  if (!context) throw new Error('useAppDialog must be used within AppDialogProvider.')
  return context
}
