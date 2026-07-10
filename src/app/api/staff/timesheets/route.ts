import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { createTimesheet, listTimesheets } from '@/lib/firestore'

export async function GET() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Staff access is required.' }, { status: 403 })
  }

  return NextResponse.json({ timesheets: await listTimesheets(user.email) })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Staff access is required.' }, { status: 403 })
  }

  const body = (await request.json()) as { workDate?: unknown; hours?: unknown; notes?: unknown }
  const workDate = typeof body.workDate === 'string' ? body.workDate : ''
  const hours = Number(body.hours)
  const notes = typeof body.notes === 'string' ? body.notes : ''

  if (!workDate || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return NextResponse.json({ message: 'Work date and valid hours are required.' }, { status: 400 })
  }

  return NextResponse.json({ timesheet: await createTimesheet({ staffEmail: user.email, workDate, hours, notes }) })
}
