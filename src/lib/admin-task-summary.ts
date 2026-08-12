import type { PublicStaffRecord, WorkSessionRecord } from './firestore'
import { todayInTimeZone } from './date-only'
import { workSessionDurationMinutes } from './work-session-format'

export type AdminTaskStatusFilter = 'all' | 'working' | 'completed' | 'not-started'
export type AdminTaskDurationSort = 'recent' | 'highest' | 'lowest'

export type AdminDailyWorkSummary = {
  key: string
  staffEmail: string
  employeeName: string
  workDate: string
  sessions: WorkSessionRecord[]
  status: 'active' | 'completed' | 'not-started'
  durationMinutes: number
}

export function buildAdminTaskSummaryPage(input: {
  sessions: WorkSessionRecord[]
  staff: PublicStaffRecord[]
  employeeSearch: string
  dateFilter: string
  statusFilter: AdminTaskStatusFilter
  durationSort: AdminTaskDurationSort
  page: number
  limit: number
  now?: number
}) {
  const now = input.now || Date.now()
  const query = input.employeeSearch.trim().toLowerCase()
  const staffNameByEmail = new Map(input.staff.map((employee) => [employee.email, employee.name]))
  const matchingSessions = input.sessions
    .filter((session) => !query || (staffNameByEmail.get(session.staffEmail) || '').toLowerCase().includes(query) || session.staffEmail.toLowerCase().includes(query))
    .filter((session) => !input.dateFilter || session.workDate === input.dateFilter)
  const grouped = new Map<string, AdminDailyWorkSummary>()

  matchingSessions.forEach((session) => {
    const key = `${session.staffEmail}:${session.workDate}`
    const existing = grouped.get(key)
    if (existing) {
      existing.sessions.push(session)
      existing.durationMinutes += workSessionDurationMinutes(session, now)
      if (session.status === 'active') existing.status = 'active'
      return
    }
    grouped.set(key, {
      key,
      staffEmail: session.staffEmail,
      employeeName: staffNameByEmail.get(session.staffEmail) || session.staffEmail,
      workDate: session.workDate,
      sessions: [session],
      status: session.status,
      durationMinutes: workSessionDurationMinutes(session, now),
    })
  })

  let summaries = [...grouped.values()]
  if (input.statusFilter === 'working') summaries = summaries.filter((summary) => summary.status === 'active')
  if (input.statusFilter === 'completed') summaries = summaries.filter((summary) => summary.status === 'completed')
  if (input.statusFilter === 'not-started') {
    const targetDate = input.dateFilter || todayInTimeZone('Asia/Kolkata')
    const employeesWithSessions = new Set(input.sessions.filter((session) => session.workDate === targetDate).map((session) => session.staffEmail))
    summaries = input.staff
      .filter((employee) => employee.active && !employeesWithSessions.has(employee.email))
      .filter((employee) => !query || employee.name.toLowerCase().includes(query) || employee.email.toLowerCase().includes(query))
      .map((employee) => ({ key: `${employee.email}:${targetDate}`, staffEmail: employee.email, employeeName: employee.name, workDate: targetDate, sessions: [], status: 'not-started' as const, durationMinutes: 0 }))
  }

  summaries.sort((a, b) => {
    if (input.durationSort === 'highest' && b.durationMinutes !== a.durationMinutes) return b.durationMinutes - a.durationMinutes
    if (input.durationSort === 'lowest' && a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes
    if (query) {
      const rankDifference = Number(!a.employeeName.toLowerCase().startsWith(query)) - Number(!b.employeeName.toLowerCase().startsWith(query))
      if (rankDifference) return rankDifference
    }
    return b.workDate.localeCompare(a.workDate) || a.staffEmail.localeCompare(b.staffEmail)
  })

  const today = todayInTimeZone('Asia/Kolkata')
  const todaySessions = input.sessions.filter((session) => session.workDate === today)
  const employeesWithSessions = new Set(todaySessions.map((session) => session.staffEmail))
  const total = summaries.length
  const start = (input.page - 1) * input.limit
  return {
    summaries: summaries.slice(start, start + input.limit),
    total,
    todaySummary: {
      working: todaySessions.filter((session) => session.status === 'active').length,
      completed: todaySessions.filter((session) => session.status === 'completed').length,
      notStarted: input.staff.filter((employee) => employee.active && !employeesWithSessions.has(employee.email)).length,
    },
  }
}

export function filterAdminTaskExport(sessions: WorkSessionRecord[], staff: PublicStaffRecord[], employeeSearch: string, dateFilter: string) {
  const query = employeeSearch.trim().toLowerCase()
  const staffNameByEmail = new Map(staff.map((employee) => [employee.email, employee.name]))
  return sessions.filter((session) => session.status === 'completed')
    .filter((session) => !dateFilter || session.workDate === dateFilter)
    .filter((session) => !query || (staffNameByEmail.get(session.staffEmail) || '').toLowerCase().includes(query) || session.staffEmail.toLowerCase().includes(query))
}

export function buildAdminTodayTaskSummary(sessions: WorkSessionRecord[], staff: PublicStaffRecord[]) {
  const today = todayInTimeZone('Asia/Kolkata')
  const todaySessions = sessions.filter((session) => session.workDate === today)
  const employeesWithSessions = new Set(todaySessions.map((session) => session.staffEmail))
  return {
    working: todaySessions.filter((session) => session.status === 'active').length,
    completed: todaySessions.filter((session) => session.status === 'completed').length,
    notStarted: staff.filter((employee) => employee.active && !employeesWithSessions.has(employee.email)).length,
  }
}
