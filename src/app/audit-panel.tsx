'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import type { AuditLogRecord } from '@/lib/firestore'
import { apiFetch } from '@/lib/client-api'
import { ToastMessage } from '@/components/ui/ToastMessage'

type AuditPage = {
  logs: AuditLogRecord[]
  nextCursor: string | null
}

function formatAuditTime(value: string) {
  if (!value) return 'Pending timestamp'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatAction(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function AuditPanel() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPage = useCallback(async (cursor: string | null, targetPage: number) => {
    setLoading(true)
    setError('')
    try {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      const result = await apiFetch<AuditPage>(`/api/admin/audit-logs${query}`)
      setLogs(result.logs)
      setNextCursor(result.nextCursor)
      setPage(targetPage)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load audit logs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPage(null, 1)
  }, [loadPage])

  function showNextPage() {
    if (!nextCursor || loading) return
    const targetPage = page + 1
    setPageCursors((current) => {
      const updated = current.slice(0, targetPage - 1)
      updated[targetPage - 1] = nextCursor
      return updated
    })
    void loadPage(nextCursor, targetPage)
  }

  function showPreviousPage() {
    if (page <= 1 || loading) return
    const targetPage = page - 1
    void loadPage(pageCursors[targetPage - 1] || null, targetPage)
  }

  return (
    <div className="surface overflow-hidden rounded-lg">
      <ToastMessage message={error} tone="error" onDismiss={() => setError('')} />
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-[#66B159]/10 text-[#66B159]">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold text-ink">Audit activity</p>
            <p className="mt-1 text-sm text-sub">10 records per page. Loaded only when opened or refreshed.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadPage(pageCursors[page - 1] || null, page)}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-ink transition-colors hover:bg-zinc-800 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-zinc-800 text-sub">
            <tr>
              <th className="px-6 py-4 font-medium">Time</th>
              <th className="px-6 py-4 font-medium">Action</th>
              <th className="px-6 py-4 font-medium">Admin</th>
              <th className="px-6 py-4 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-14 text-center text-sub"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Loading audit activity...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-14 text-center text-sub">No audit records are available.</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="border-b border-zinc-800 last:border-none">
                <td className="whitespace-nowrap px-6 py-4 text-sub">{formatAuditTime(log.timestamp)}</td>
                <td className="whitespace-nowrap px-6 py-4 font-medium text-ink">{formatAction(log.action)}</td>
                <td className="px-6 py-4 text-sub">{log.actorEmail || 'System'}</td>
                <td className="max-w-xl px-6 py-4 text-sub">
                  <p className="leading-6 text-ink/90">{log.details || 'No details recorded.'}</p>
                  {log.targetId ? <p className="mt-1 truncate text-xs text-ghost">Target: {log.targetId}</p> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-zinc-800 px-6 py-4">
        <p className="text-sm text-sub">Page {page}</p>
        <div className="flex gap-2">
          <button type="button" onClick={showPreviousPage} disabled={page === 1 || loading} className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-700 px-3 text-sm font-medium text-ink hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Previous</button>
          <button type="button" onClick={showNextPage} disabled={!nextCursor || loading} className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-700 px-3 text-sm font-medium text-ink hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40">Next<ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  )
}
