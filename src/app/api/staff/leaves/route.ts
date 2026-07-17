import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { createLeaveRequest, listLeaveRequests, listLeaveRequestsPage } from '@/lib/firestore'
import { readPagination } from '@/lib/pagination'
import { countDateOnlyDaysInclusive } from '@/lib/date-only'
import { LEAVE_ALLOWANCES, type LeaveType } from '@/lib/leave'

export async function GET(request: Request) {
  const cookieStore = await cookies(); const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'staff' })
  if (!user || user.role !== 'staff') return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  const pagination = readPagination(request)
  if (pagination) { const page = await listLeaveRequestsPage(pagination, user.email); return NextResponse.json({ leaves: page.items, nextCursor: page.nextCursor }) }
  return NextResponse.json({ leaves: await listLeaveRequests(user.email) })
}
export async function POST(request: Request) {
  const cookieStore = await cookies(); const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'staff' })
  if (!user || user.role !== 'staff') return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  let body: { startDate?: unknown; endDate?: unknown; leaveType?: unknown; reason?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid leave request.' }, { status: 400 }) }
  const startDate = typeof body.startDate === 'string' ? body.startDate : ''
  const endDate = typeof body.endDate === 'string' ? body.endDate : ''
  const leaveType = body.leaveType === 'sick' || body.leaveType === 'flexi' ? body.leaveType as LeaveType : null
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  const durationDays = countDateOnlyDaysInclusive(startDate, endDate)
  if (!leaveType || !reason || reason.length > 2000 || durationDays < 1 || startDate.slice(0, 4) !== endDate.slice(0, 4)) {
    return NextResponse.json({ message: 'Select a leave type and valid dates within the same calendar year, then enter a reason.' }, { status: 400 })
  }
  if (durationDays > LEAVE_ALLOWANCES[leaveType]) return NextResponse.json({ message: `${leaveType === 'sick' ? 'Sick' : 'Flexi'} leave allows up to ${LEAVE_ALLOWANCES[leaveType]} days per year.` }, { status: 400 })
  try {
    return NextResponse.json({ leave: await createLeaveRequest({ staffEmail: user.email, startDate, endDate, leaveType, reason }) }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('LEAVE_ALLOWANCE_EXCEEDED:')) {
      const remaining = Number(error.message.split(':')[1] || 0)
      return NextResponse.json({ message: `Only ${remaining} ${remaining === 1 ? 'day' : 'days'} of ${leaveType === 'sick' ? 'sick' : 'flexi'} leave remain for ${startDate.slice(0, 4)}.` }, { status: 409 })
    }
    console.error(`Failed to create leave request for ${user.email}:`, error)
    return NextResponse.json({ message: 'Failed to submit leave request.' }, { status: 500 })
  }
}
