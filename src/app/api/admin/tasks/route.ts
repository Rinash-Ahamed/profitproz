import { NextResponse } from 'next/server'
import { listRecentWorkSessionsPage, listWorkSessions, listWorkSessionsPage } from '@/lib/firestore'
import { readPagination } from '@/lib/pagination'
import { requireAdminSession } from '@/lib/api-auth'
import { timedApiResponse } from '@/lib/api-timing'
import { buildAdminTaskSummaryPage, buildAdminTodayTaskSummary, filterAdminTaskExport, type AdminTaskDurationSort, type AdminTaskStatusFilter } from '@/lib/admin-task-summary'
import { listStaffAccounts } from '@/lib/firestore'
import { parseDateOnly, todayInTimeZone } from '@/lib/date-only'

let retainedTaskCache: { sessions: Awaited<ReturnType<typeof listWorkSessions>>; expiresAt: number } | null = null

async function listCachedRetainedWorkSessions(forceRefresh = false) {
  if (!forceRefresh && retainedTaskCache && retainedTaskCache.expiresAt > Date.now()) return retainedTaskCache.sessions
  const sessions = await listWorkSessions()
  retainedTaskCache = { sessions, expiresAt: Date.now() + 10_000 }
  return sessions
}

export async function GET(request: Request) {
  return timedApiResponse('GET /api/admin/tasks', async () => {
    const user = await requireAdminSession()
    if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
    try {
      const url = new URL(request.url)
      const view = url.searchParams.get('view')
      const forceRefresh = url.searchParams.has('refresh')
      if (view === 'summary' || view === 'export') {
        const employeeSearch = url.searchParams.get('employeeSearch')?.slice(0, 120) || ''
        const dateFrom = url.searchParams.get('from') || ''
        const dateTo = url.searchParams.get('to') || ''
        if ((dateFrom && !parseDateOnly(dateFrom)) || (dateTo && !parseDateOnly(dateTo)) || (dateFrom && dateTo && dateFrom > dateTo)) {
          return NextResponse.json({ message: 'Select a valid task date range.' }, { status: 400 })
        }
        const requestedPage = Number(url.searchParams.get('page') || 1)
        const page = Number.isInteger(requestedPage) ? Math.max(1, requestedPage) : 1
        const statusValue = url.searchParams.get('status')
        const statusFilter: AdminTaskStatusFilter = statusValue === 'working' || statusValue === 'completed' || statusValue === 'not-started' ? statusValue : 'all'
        const sortValue = url.searchParams.get('sort')
        const durationSort: AdminTaskDurationSort = sortValue === 'highest' || sortValue === 'lowest' ? sortValue : 'recent'
        const useEfficientDefaultPage = view === 'summary' && !employeeSearch.trim() && !dateFrom && !dateTo && statusFilter === 'all' && durationSort === 'recent'

        if (useEfficientDefaultPage) {
          const today = todayInTimeZone('Asia/Kolkata')
          const [recentPage, todaySessions, staff] = await Promise.all([
            listRecentWorkSessionsPage(page, 10),
            listWorkSessions(undefined, { from: today, to: today }),
            listStaffAccounts(),
          ])
          const publicStaff = staff.map(({ passwordHash: _passwordHash, ...employee }) => employee)
          const pageSummary = buildAdminTaskSummaryPage({ sessions: recentPage.items, staff: publicStaff, employeeSearch: '', dateFrom: '', dateTo: '', statusFilter: 'all', durationSort: 'recent', page: 1, limit: 10 })
          return NextResponse.json({ summaries: pageSummary.summaries, total: recentPage.total, todaySummary: buildAdminTodayTaskSummary(todaySessions, publicStaff) })
        }

        const today = todayInTimeZone('Asia/Kolkata')
        const [workSessions, staff, todaySessions] = await Promise.all([
          dateFrom || dateTo ? listWorkSessions(undefined, { from: dateFrom, to: dateTo || undefined }) : listCachedRetainedWorkSessions(forceRefresh),
          listStaffAccounts(),
          view === 'summary' ? listWorkSessions(undefined, { from: today, to: today }) : Promise.resolve([]),
        ])
        const publicStaff = staff.map(({ passwordHash: _passwordHash, ...employee }) => employee)
        if (view === 'export') return NextResponse.json({ workSessions: filterAdminTaskExport(workSessions, publicStaff, employeeSearch, dateFrom, dateTo) })
        const result = buildAdminTaskSummaryPage({ sessions: workSessions, staff: publicStaff, employeeSearch, dateFrom, dateTo, statusFilter, durationSort, page, limit: 10 })
        return NextResponse.json({ ...result, todaySummary: buildAdminTodayTaskSummary(todaySessions, publicStaff) })
      }
      const pagination = readPagination(request)
      if (pagination) {
        const page = await listWorkSessionsPage(pagination)
        return NextResponse.json({ workSessions: page.items, nextCursor: page.nextCursor })
      }
      return NextResponse.json({ workSessions: await listWorkSessions() })
    } catch (error) {
      console.error('Failed to load Admin work sessions:', error)
      return NextResponse.json({ message: 'Unable to load employee work logs.' }, { status: 500 })
    }
  })
}
