import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { createTimesheet, listTimesheets, listTimesheetsPage } from '@/lib/firestore'
import { addDateOnlyDays, dateOnlyDay, parseDateOnly } from '@/lib/date-only'
import { readPagination } from '@/lib/pagination'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'staff' })

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  }

  const pagination = readPagination(request)
  if (pagination) { const page = await listTimesheetsPage(pagination, user.email); return NextResponse.json({ timesheets: page.items, nextCursor: page.nextCursor }) }
  return NextResponse.json({ timesheets: await listTimesheets(user.email) })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'staff' })

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  }

  let body: { weekStart?: unknown; weekEnd?: unknown; workedDates?: unknown; workLocation?: unknown; notes?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid timesheet request.' }, { status: 400 }) }
  const weekStart = typeof body.weekStart === 'string' ? body.weekStart : ''
  const weekEnd = typeof body.weekEnd === 'string' ? body.weekEnd : ''
  const workedDates = Array.isArray(body.workedDates) ? [...new Set(body.workedDates.filter((date): date is string => typeof date === 'string'))] : []
  const workLocation = body.workLocation === 'office' ? 'office' : body.workLocation === 'remote' ? 'remote' : ''
  const notes = typeof body.notes === 'string' ? body.notes : ''

  const isSundayToSaturday = dateOnlyDay(weekStart) === 0 && weekEnd === addDateOnlyDays(weekStart, 6)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !/^\d{4}-\d{2}-\d{2}$/.test(weekEnd) || !workLocation || workedDates.length === 0 || workedDates.length > 7 || notes.length > 2000 || !isSundayToSaturday) {
    return NextResponse.json({ message: 'Select a Sunday-to-Saturday week, at least one worked day, and a work location.' }, { status: 400 })
  }

  if (workedDates.some((date) => !parseDateOnly(date) || date < weekStart || date > weekEnd)) {
    return NextResponse.json({ message: 'Worked dates must be within the selected week.' }, { status: 400 })
  }

  return NextResponse.json({ timesheet: await createTimesheet({ staffEmail: user.email, weekStart, weekEnd, workedDates, workLocation, notes }) })
}
