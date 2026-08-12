import { NextResponse } from 'next/server'
import { listWorkSessions, listWorkSessionsPage } from '@/lib/firestore'
import { readPagination } from '@/lib/pagination'
import { requireAdminSession } from '@/lib/api-auth'
import { timedApiResponse } from '@/lib/api-timing'
import { buildAdminTaskSummaryPage, filterAdminTaskExport, type AdminTaskDurationSort, type AdminTaskStatusFilter } from '@/lib/admin-task-summary'
import { listStaffAccounts } from '@/lib/firestore'

export async function GET(request: Request) {
  return timedApiResponse('GET /api/admin/tasks', async () => {
    const user = await requireAdminSession()
    if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
    try {
      const url = new URL(request.url)
      const view = url.searchParams.get('view')
      if (view === 'summary' || view === 'export') {
        const [workSessions, staff] = await Promise.all([listWorkSessions(), listStaffAccounts()])
        const publicStaff = staff.map(({ passwordHash: _passwordHash, ...employee }) => employee)
        const employeeSearch = url.searchParams.get('employeeSearch')?.slice(0, 120) || ''
        const dateFilter = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date') || '') ? url.searchParams.get('date') || '' : ''
        if (view === 'export') return NextResponse.json({ workSessions: filterAdminTaskExport(workSessions, publicStaff, employeeSearch, dateFilter) })
        const requestedPage = Number(url.searchParams.get('page') || 1)
        const page = Number.isInteger(requestedPage) ? Math.max(1, requestedPage) : 1
        const statusValue = url.searchParams.get('status')
        const statusFilter: AdminTaskStatusFilter = statusValue === 'working' || statusValue === 'completed' || statusValue === 'not-started' ? statusValue : 'all'
        const sortValue = url.searchParams.get('sort')
        const durationSort: AdminTaskDurationSort = sortValue === 'highest' || sortValue === 'lowest' ? sortValue : 'recent'
        return NextResponse.json(buildAdminTaskSummaryPage({ sessions: workSessions, staff: publicStaff, employeeSearch, dateFilter, statusFilter, durationSort, page, limit: 10 }))
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
