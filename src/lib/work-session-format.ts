import type { WorkSessionRecord } from '@/lib/firestore'

export function formatWorkTime(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function formatWorkDuration(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`
}

export function workSessionDurationMinutes(session: WorkSessionRecord, now: number) {
  if (session.status !== 'active') return Math.max(0, session.durationMinutes)
  const started = new Date(session.startedAt).getTime()
  return Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 60_000)) : 0
}

export function formatLiveWorkDuration(startedAt: string, now: number) {
  const started = new Date(startedAt).getTime()
  if (!Number.isFinite(started)) return '0m'
  return formatWorkDuration(Math.max(0, Math.floor((now - started) / 60_000)))
}
