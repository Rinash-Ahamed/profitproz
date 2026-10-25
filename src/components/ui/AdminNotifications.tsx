'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Bell, CalendarDays, ChevronDown, Loader2, RefreshCw, Trash2, X } from 'lucide-react'
import type { AdminNotificationPage } from '@/lib/admin-notifications'
import { apiFetch } from '@/lib/client-api'
import { formatDateOnlyDisplay } from '@/lib/date-only'
import { PortalActionButton } from './PortalActionButton'
import { useAppDialog } from './AppDialogProvider'

const emptyPage: AdminNotificationPage = { notifications: [], unreadCount: 0, nextCursor: null }

export function AdminNotifications({ onOpenLeaves }: { onOpenLeaves: () => void }) {
  const { confirmAction } = useAppDialog()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(emptyPage)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const generation = useRef(0)
  const busyRef = useRef(false)
  const openRef = useRef(false)
  const inFlightRef = useRef(false)
  const panelId = useId()

  const load = useCallback(async (cursor?: string) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    const version = ++generation.current
    inFlightRef.current = true
    setLoading(true)
    try {
      const data = await apiFetch<AdminNotificationPage>(`/api/admin/notifications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, { signal: controller.signal, cache: 'no-store' })
      if (controller.signal.aborted || version !== generation.current) return null
      setPage((current) => ({ ...data, notifications: cursor
        ? [...current.notifications, ...data.notifications.filter((item) => !current.notifications.some((existing) => existing.id === item.id))]
        : data.notifications }))
      setError('')
      return data
    } catch (caught) {
      if (!controller.signal.aborted && version === generation.current) setError(caught instanceof Error ? caught.message : 'Unable to load notifications.')
      return null
    } finally {
      if (!controller.signal.aborted && version === generation.current) {
        inFlightRef.current = false
        setLoading(false)
      }
    }
  }, [])

  const loadUnreadCount = useCallback(async () => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    const version = ++generation.current
    inFlightRef.current = true
    try {
      const data = await apiFetch<{ unreadCount: number }>('/api/admin/notifications?view=unread', { signal: controller.signal, cache: 'no-store' })
      if (!controller.signal.aborted && version === generation.current) {
        setPage((current) => ({ ...current, unreadCount: data.unreadCount }))
        setError('')
      }
    } catch (caught) {
      if (!controller.signal.aborted && version === generation.current) setError(caught instanceof Error ? caught.message : 'Unable to load notifications.')
    } finally {
      if (!controller.signal.aborted && version === generation.current) inFlightRef.current = false
    }
  }, [])

  function close() {
    openRef.current = false
    setOpen(false)
  }

  async function update(action: 'read' | 'clear', throughId: string) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    requestRef.current?.abort()
    generation.current++
    inFlightRef.current = false
    try {
      await apiFetch('/api/admin/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, throughId }) })
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update notifications.')
    } finally {
      busyRef.current = false
      setBusy(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    const refresh = () => {
      if (document.hidden || busyRef.current || inFlightRef.current) return
      if (openRef.current) void load()
      else void loadUnreadCount()
    }
    refresh()
    const timer = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      requestRef.current?.abort()
      inFlightRef.current = false
    }
  }, [load, loadUnreadCount])

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) close() }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { close(); buttonRef.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])

  async function toggle() {
    if (openRef.current) { close(); return }
    openRef.current = true
    setOpen(true)
    if (busyRef.current) return
    const latest = await load()
    if (latest?.unreadCount && latest.notifications[0]) await update('read', latest.notifications[0].id)
  }

  async function clearPast() {
    const throughId = page.notifications[0]?.id
    if (!throughId || busyRef.current) return
    if (!await confirmAction({ title: 'Clear past notifications?', message: 'Clear these notifications from your Admin account? Leave requests will stay available in Leaves. Newer notifications will be kept.', confirmLabel: 'Clear notifications', tone: 'warning' })) return
    await update('clear', throughId)
  }

  return <div ref={rootRef} className="relative" onBlur={(event) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close()
  }}>
    <button ref={buttonRef} type="button" onClick={() => void toggle()} aria-label={`Notifications${page.unreadCount ? `, ${page.unreadCount} unread` : ''}`} title="Notifications" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sub transition-colors hover:bg-zinc-700 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#66B159]">
      <Bell className="h-5 w-5" aria-hidden="true" />
      {page.unreadCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#66B159] px-1 text-[10px] font-bold text-white" aria-hidden="true">{page.unreadCount > 99 ? '99+' : page.unreadCount}</span> : null}
    </button>
    <span className="sr-only" role="status" aria-live="polite">{page.unreadCount ? `${page.unreadCount} unread notifications` : ''}</span>
    {open ? <section id={panelId} role="dialog" aria-labelledby={`${panelId}-title`} className="surface fixed left-4 right-4 top-24 z-50 overflow-hidden rounded-xl border border-zinc-700 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[26rem]">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 p-4">
        <h2 id={`${panelId}-title`} className="text-sm font-semibold text-ink">Notifications</h2>
        <button type="button" onClick={() => { close(); buttonRef.current?.focus() }} aria-label="Close notifications" title="Close notifications" className="flex h-8 w-8 items-center justify-center rounded-md text-sub hover:bg-zinc-800"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-2">
        <PortalActionButton onClick={() => void load()} disabled={busy || loading} className="h-9 rounded-md px-2 text-xs text-sub hover:bg-zinc-800"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</PortalActionButton>
        <PortalActionButton onClick={() => void clearPast()} disabled={busy || loading || !page.notifications.length} className="h-9 rounded-md px-2 text-xs text-sub hover:bg-zinc-800 disabled:opacity-50"><Trash2 className="h-4 w-4" />Clear past</PortalActionButton>
      </div>
      {error ? <p role="alert" className="px-4 py-3 text-xs text-red-400">{error}</p> : null}
      <div className="max-h-[min(60vh,28rem)] overflow-y-auto">
        {loading && !page.notifications.length ? <p className="flex items-center justify-center gap-2 p-8 text-sm text-sub"><Loader2 className="h-4 w-4 animate-spin" />Loading notifications…</p>
          : !page.notifications.length ? <p className="p-8 text-center text-sm text-sub">No notifications.</p>
            : <ul className="divide-y divide-zinc-800">{page.notifications.map((notification) => <li key={notification.id}>
              <button type="button" onClick={() => { close(); onOpenLeaves() }} className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-zinc-800/60 ${notification.unread ? 'bg-[#66B159]/5' : ''}`}>
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#66B159]" aria-hidden="true" />
                <span className="min-w-0 text-sm text-ink"><span className="block font-semibold">New leave request</span><span className="mt-1 block break-all text-xs text-sub">{notification.staffEmail}</span><span className="mt-1 block text-xs text-sub">{formatDateOnlyDisplay(notification.startDate)}{notification.endDate !== notification.startDate ? ` – ${formatDateOnlyDisplay(notification.endDate)}` : ''} · {notification.durationDays === 0.5 ? 'Half day' : `${notification.durationDays} ${notification.durationDays === 1 ? 'day' : 'days'}`}</span><time dateTime={notification.createdAt} className="mt-2 block text-[11px] text-ghost">{new Date(notification.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} IST</time></span>
              </button>
            </li>)}</ul>}
        {page.nextCursor ? <div className="border-t border-zinc-800 p-3"><PortalActionButton onClick={() => void load(page.nextCursor!)} disabled={busy || loading} className="h-9 w-full rounded-md px-3 text-xs text-sub hover:bg-zinc-800 disabled:opacity-50"><ChevronDown className="h-4 w-4" />Older notifications</PortalActionButton></div> : null}
      </div>
    </section> : null}
  </div>
}
