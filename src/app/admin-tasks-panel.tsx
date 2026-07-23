'use client'

import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Edit, FileDown, Loader2, Search } from 'lucide-react'
import type { PublicStaffRecord, WorkSessionRecord } from '@/lib/firestore'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { formatDateOnlyDisplay, todayLocalDateOnly } from '@/lib/date-only'
import { formatWorkDuration, formatWorkTime, workSessionDurationMinutes } from '@/lib/work-session-format'

type TaskStatusFilter = 'all' | 'working' | 'completed' | 'not-started'
type TaskDurationSort = 'recent' | 'highest' | 'lowest'
type DailyWorkSummary = {
  key: string
  staffEmail: string
  workDate: string
  sessions: WorkSessionRecord[]
  status: 'active' | 'completed' | 'not-started'
  durationMinutes: number
}

export function AdminTasksPanel({ staff, sessions, loading, now, onCorrect, onError }: {
  staff: PublicStaffRecord[]
  sessions: WorkSessionRecord[]
  loading: boolean
  now: number
  onCorrect: (session: WorkSessionRecord) => void
  onError: (message: string) => void
}) {
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all')
  const [durationSort, setDurationSort] = useState<TaskDurationSort>('recent')
  const [expandedSummary, setExpandedSummary] = useState('')
  const staffNameByEmail = useMemo(() => new Map(staff.map((employee) => [employee.email, employee.name])), [staff])

  const summaries = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase()
    const matchingSessions = sessions
      .filter((session) => {
        if (!query) return true
        const employeeName = staffNameByEmail.get(session.staffEmail) || ''
        return employeeName.toLowerCase().includes(query) || session.staffEmail.toLowerCase().includes(query)
      })
      .filter((session) => !dateFilter || session.workDate === dateFilter)

    const grouped = new Map<string, DailyWorkSummary>()
    matchingSessions.forEach((session) => {
      const key = `${session.staffEmail}:${session.workDate}`
      const existing = grouped.get(key)
      if (existing) {
        existing.sessions.push(session)
        existing.durationMinutes += workSessionDurationMinutes(session, now)
        if (session.status === 'active') existing.status = 'active'
      } else {
        grouped.set(key, {
          key,
          staffEmail: session.staffEmail,
          workDate: session.workDate,
          sessions: [session],
          status: session.status,
          durationMinutes: workSessionDurationMinutes(session, now),
        })
      }
    })

    let result = [...grouped.values()]
    if (statusFilter === 'working') result = result.filter((summary) => summary.status === 'active')
    if (statusFilter === 'completed') result = result.filter((summary) => summary.status === 'completed')
    if (statusFilter === 'not-started') {
      const targetDate = dateFilter || todayLocalDateOnly()
      const employeesWithSessions = new Set(sessions.filter((session) => session.workDate === targetDate).map((session) => session.staffEmail))
      result = staff
        .filter((employee) => employee.active && !employeesWithSessions.has(employee.email))
        .filter((employee) => !query || employee.name.toLowerCase().includes(query) || employee.email.toLowerCase().includes(query))
        .map((employee) => ({
          key: `${employee.email}:${targetDate}`,
          staffEmail: employee.email,
          workDate: targetDate,
          sessions: [],
          status: 'not-started' as const,
          durationMinutes: 0,
        }))
    }

    return result.sort((a, b) => {
      if (durationSort === 'highest' && b.durationMinutes !== a.durationMinutes) return b.durationMinutes - a.durationMinutes
      if (durationSort === 'lowest' && a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes
      if (query) {
        const aName = staffNameByEmail.get(a.staffEmail)?.toLowerCase() || a.staffEmail.toLowerCase()
        const bName = staffNameByEmail.get(b.staffEmail)?.toLowerCase() || b.staffEmail.toLowerCase()
        const rankDifference = Number(!aName.startsWith(query)) - Number(!bName.startsWith(query))
        if (rankDifference) return rankDifference
      }
      return b.workDate.localeCompare(a.workDate) || a.staffEmail.localeCompare(b.staffEmail)
    })
  }, [dateFilter, durationSort, employeeSearch, now, sessions, staff, staffNameByEmail, statusFilter])

  const todaySummary = useMemo(() => {
    const today = todayLocalDateOnly()
    const todaySessions = sessions.filter((session) => session.workDate === today)
    const employeesWithSessions = new Set(todaySessions.map((session) => session.staffEmail))
    return {
      working: todaySessions.filter((session) => session.status === 'active').length,
      completed: todaySessions.filter((session) => session.status === 'completed').length,
      notStarted: staff.filter((employee) => employee.active && !employeesWithSessions.has(employee.email)).length,
    }
  }, [sessions, staff])

  function exportWorkingDays() {
    const query = employeeSearch.trim().toLowerCase()
    const completed = sessions
      .filter((session) => session.status === 'completed')
      .filter((session) => !dateFilter || session.workDate === dateFilter)
      .filter((session) => {
        if (!query) return true
        const name = staffNameByEmail.get(session.staffEmail) || ''
        return name.toLowerCase().includes(query) || session.staffEmail.toLowerCase().includes(query)
      })
    if (!completed.length) {
      onError('No completed working days match the selected employee and date filters.')
      return
    }

    const byEmployee = new Map<string, { dates: Set<string>; minutes: number }>()
    completed.forEach((session) => {
      const current = byEmployee.get(session.staffEmail) || { dates: new Set<string>(), minutes: 0 }
      current.dates.add(session.workDate)
      current.minutes += Math.max(0, session.durationMinutes)
      byEmployee.set(session.staffEmail, current)
    })
    const csvValue = (value: unknown) => {
      const text = String(value ?? '')
      const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
      return `"${safe.replaceAll('"', '""')}"`
    }
    const rows = [...byEmployee.entries()]
      .map(([email, summary]) => ({ name: staffNameByEmail.get(email) || email, email, summary }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, email, summary }) => [
        name,
        email,
        summary.dates.size,
        Math.round(summary.minutes),
        formatWorkDuration(summary.minutes),
        [...summary.dates].sort().map(formatDateOnlyDisplay).join('; '),
      ].map(csvValue).join(','))
    const csv = ['sep=,', 'Employee,Email,Working Days,Total Minutes,Total Hours,Worked Dates', ...rows].join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `working-days-${dateFilter || 'all-dates'}-${todayLocalDateOnly()}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const hasFilters = employeeSearch || dateFilter || statusFilter !== 'all' || durationSort !== 'recent'
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <TaskMetric label="Working now" value={todaySummary.working} detail="Active today" tone="green" />
        <TaskMetric label="Completed today" value={todaySummary.completed} detail="Work summaries submitted" tone="green" />
        <TaskMetric label="Not started" value={todaySummary.notStarted} detail="Active employees today" tone="amber" />
      </div>
      <div className="surface rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 p-6">
          <div><p className="text-lg font-semibold text-ink">Daily Employee Summary</p><p className="mt-1 text-sm text-sub">Compact daily totals with expandable work details.</p></div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="relative block"><span className="sr-only">Search employee</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost" /><input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} className="h-10 w-56 max-w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-sm text-ink placeholder:text-ghost focus:border-[#66B159] focus:outline-none" placeholder="Search employee" /></label>
            <label className="block w-44"><span className="sr-only">Filter by work date</span><DatePickerInput value={dateFilter} onChange={setDateFilter} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none" /></label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TaskStatusFilter)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink"><option value="all">All statuses</option><option value="working">Working</option><option value="completed">Completed</option><option value="not-started">Not started</option></select>
            <select value={durationSort} onChange={(event) => setDurationSort(event.target.value as TaskDurationSort)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink"><option value="recent">Newest first</option><option value="highest">Highest hours</option><option value="lowest">Lowest hours</option></select>
            {hasFilters ? <button type="button" onClick={() => { setEmployeeSearch(''); setDateFilter(''); setStatusFilter('all'); setDurationSort('recent') }} className="h-10 rounded-lg border border-zinc-700 px-3 text-sm font-medium text-sub hover:text-ink">Clear filters</button> : null}
            <button type="button" onClick={exportWorkingDays} className="flex h-10 items-center gap-2 rounded-lg bg-[#66B159] px-3 text-sm font-semibold text-white hover:bg-[#73bd66]"><FileDown className="h-4 w-4" /> Export working days</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-zinc-700 text-left"><tr><th className="w-12 px-4 py-4"><span className="sr-only">Expand</span></th><th className="px-4 py-4 font-medium text-sub">Employee</th><th className="px-4 py-4 font-medium text-sub">Date</th><th className="px-4 py-4 font-medium text-sub">Status</th><th className="px-4 py-4 font-medium text-sub">Duration</th><th className="px-4 py-4 font-medium text-sub">Summary</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="py-10 text-center text-sub"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr> : summaries.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-sub">{hasFilters ? 'No employee summaries match the selected filters.' : 'No work sessions recorded yet.'}</td></tr> : summaries.map((summary) => {
                const expanded = expandedSummary === summary.key
                const firstNote = summary.sessions.find((session) => session.notes)?.notes
                return <Fragment key={summary.key}>
                  <tr className="border-b border-zinc-800">
                    <td className="px-4 py-4">{summary.sessions.length ? <button type="button" onClick={() => setExpandedSummary(expanded ? '' : summary.key)} className="flex h-8 w-8 items-center justify-center rounded-md text-sub hover:bg-zinc-800 hover:text-ink">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button> : null}</td>
                    <td className="px-4 py-4"><p className="font-medium text-ink">{staffNameByEmail.get(summary.staffEmail) || summary.staffEmail}</p><p className="text-xs text-sub">{summary.staffEmail}</p></td>
                    <td className="whitespace-nowrap px-4 py-4 text-sub">{formatDateOnlyDisplay(summary.workDate)}</td>
                    <td className="px-4 py-4"><TaskStatus status={summary.status} /></td>
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-ink">{formatWorkDuration(summary.durationMinutes)}</td>
                    <td className="max-w-sm px-4 py-4 text-sub"><p className="truncate">{firstNote || (summary.status === 'active' ? 'Work currently in progress.' : summary.status === 'not-started' ? 'Work has not been started.' : 'No summary recorded.')}</p></td>
                  </tr>
                  {expanded ? <tr className="border-b border-zinc-800 bg-zinc-950/35"><td colSpan={6} className="px-6 py-5"><div className="space-y-3">{summary.sessions.map((session) => <div key={session.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-sub"><span>Start: <strong className="font-medium text-ink">{formatWorkTime(session.startedAt)}</strong></span><span>End: <strong className="font-medium text-ink">{session.endedAt ? formatWorkTime(session.endedAt) : 'In progress'}</strong></span><span>Duration: <strong className="font-medium text-ink">{formatWorkDuration(workSessionDurationMinutes(session, now))}</strong></span></div><button type="button" onClick={() => onCorrect(session)} className="flex h-8 items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 text-xs font-medium text-sub hover:border-[#66B159]/50 hover:text-ink"><Edit className="h-3.5 w-3.5" /> Correct time</button></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-sub">{session.notes || (session.status === 'active' ? 'Work currently in progress.' : 'No work summary recorded.')}</p></div>)}</div></td></tr> : null}
                </Fragment>
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TaskStatus({ status }: { status: DailyWorkSummary['status'] }) {
  const style = status === 'completed' ? 'border-green-500/20 bg-green-500/10 text-green-400' : status === 'not-started' ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' : 'border-[#66B159]/25 bg-[#66B159]/10 text-[#66B159]'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>{status === 'completed' ? 'Completed' : status === 'not-started' ? 'Not started' : 'Working'}</span>
}

function TaskMetric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: 'green' | 'amber' }) {
  return <div className="surface rounded-lg p-5"><p className={`text-2xl font-semibold ${tone === 'amber' ? 'text-amber-400' : 'text-[#66B159]'}`}>{value}</p><p className="mt-2 text-sm font-medium text-ink">{label}</p><p className="mt-1 text-xs text-sub">{detail}</p></div>
}
