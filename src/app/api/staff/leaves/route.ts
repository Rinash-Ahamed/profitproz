import { NextResponse } from 'next/server'
import { createLeaveRequest, listLeaveRequests, listLeaveRequestsPage } from '@/lib/firestore'
import { readPagination } from '@/lib/pagination'
import { countNonSundayDaysInclusive } from '@/lib/date-only'
import { requireStaffSession } from '@/lib/api-auth'
import { HALF_DAY_LEAVE_START_DATE, type HalfDayPeriod, type LeaveDurationType } from '@/lib/leave'

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
  let body: { startDate?: unknown; endDate?: unknown; reason?: unknown; durationType?: unknown; halfDayPeriod?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid leave request.' }, { status: 400 }) }
  const startDate = typeof body.startDate === 'string' ? body.startDate : ''
  const endDate = typeof body.endDate === 'string' ? body.endDate : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  const durationType: LeaveDurationType = body.durationType === 'half_day' ? 'half_day' : 'full_day'
  const halfDayPeriod: HalfDayPeriod | undefined = durationType === 'half_day' ? (body.halfDayPeriod === 'second_half' ? 'second_half' : 'first_half') : undefined
  const durationDays = durationType === 'half_day' ? (startDate === endDate && countNonSundayDaysInclusive(startDate, endDate) === 1 ? 0.5 : 0) : countNonSundayDaysInclusive(startDate, endDate)
  if (durationType === 'half_day' && startDate < HALF_DAY_LEAVE_START_DATE) return NextResponse.json({ message: 'Half-day leave is available from September 2026.' }, { status: 400 })
  if (!reason || reason.length > 2000 || durationDays < 0.5 || startDate.slice(0, 4) !== endDate.slice(0, 4)) {
    return NextResponse.json({ message: 'Select a valid non-Sunday leave date within the same calendar year, then enter a reason.' }, { status: 400 })
  }
  try {
    return NextResponse.json({ leave: await createLeaveRequest({ staffEmail: user.email, startDate, endDate, reason, durationType, halfDayPeriod }) }, { status: 201 })
  } catch (error) {
    console.error(`Failed to create leave request for ${user.email}:`, error)
    return NextResponse.json({ message: 'Failed to submit leave request.' }, { status: 500 })
  }
}
