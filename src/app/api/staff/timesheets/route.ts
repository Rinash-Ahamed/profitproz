import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { createTimesheet, listTimesheets } from '@/lib/firestore'

export async function GET() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  }

  return NextResponse.json({ timesheets: await listTimesheets(user.email) })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  }

  const body = (await request.json()) as { weekStart?: unknown; weekEnd?: unknown; workedDates?: unknown; workLocation?: unknown; notes?: unknown }
  const weekStart = typeof body.weekStart === 'string' ? body.weekStart : ''
  const weekEnd = typeof body.weekEnd === 'string' ? body.weekEnd : ''
  const workedDates = Array.isArray(body.workedDates) ? body.workedDates.filter((date): date is string => typeof date === 'string') : []
  const workLocation = body.workLocation === 'office' ? 'office' : body.workLocation === 'remote' ? 'remote' : ''
  const notes = typeof body.notes === 'string' ? body.notes : ''

  const start = new Date(`${weekStart}T00:00:00`)
  const end = new Date(`${weekEnd}T00:00:00`)
  const isSundayToSaturday = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start.getDay() === 0 && Math.round((end.getTime() - start.getTime()) / 86400000) === 6

  if (!weekStart || !weekEnd || !workLocation || workedDates.length === 0 || !isSundayToSaturday) {
    return NextResponse.json({ message: 'Select a Sunday-to-Saturday week, at least one worked day, and a work location.' }, { status: 400 })
  }

  if (workedDates.some((date) => { const worked = new Date(`${date}T00:00:00`); return Number.isNaN(worked.getTime()) || worked < start || worked > end })) {
    return NextResponse.json({ message: 'Worked dates must be within the selected week.' }, { status: 400 })
  }

  return NextResponse.json({ timesheet: await createTimesheet({ staffEmail: user.email, weekStart, weekEnd, workedDates, workLocation, notes }) })
}
