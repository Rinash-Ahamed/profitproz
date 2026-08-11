import { NextResponse } from 'next/server'
import { createLeaveRequest, listLeaveRequests, listLeaveRequestsPage } from '@/lib/firestore'
import { readPagination } from '@/lib/pagination'
import { countNonSundayDaysInclusive } from '@/lib/date-only'
import { requireStaffSession } from '@/lib/api-auth'

export async function GET(request: Request) {
  const user = await requireStaffSession()
  if (!user || user.role !== 'staff') return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  const pagination = readPagination(request)
  if (pagination) { const page = await listLeaveRequestsPage(pagination, user.email); return NextResponse.json({ leaves: page.items, nextCursor: page.nextCursor }) }
  return NextResponse.json({ leaves: await listLeaveRequests(user.email) })
}
export async function POST(request: Request) {
  const user = await requireStaffSession()
  if (!user || user.role !== 'staff') return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  let body: { startDate?: unknown; endDate?: unknown; reason?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid leave request.' }, { status: 400 }) }
  const startDate = typeof body.startDate === 'string' ? body.startDate : ''
  const endDate = typeof body.endDate === 'string' ? body.endDate : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  const durationDays = countNonSundayDaysInclusive(startDate, endDate)
  if (!reason || reason.length > 2000 || durationDays < 1 || startDate.slice(0, 4) !== endDate.slice(0, 4)) {
    return NextResponse.json({ message: 'Select at least one non-Sunday date within the same calendar year, then enter a reason.' }, { status: 400 })
  }
  try {
    return NextResponse.json({ leave: await createLeaveRequest({ staffEmail: user.email, startDate, endDate, reason }) }, { status: 201 })
  } catch (error) {
    console.error(`Failed to create leave request for ${user.email}:`, error)
    return NextResponse.json({ message: 'Failed to submit leave request.' }, { status: 500 })
  }
}
