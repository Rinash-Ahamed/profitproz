import { NextResponse } from 'next/server'
import { listWorkSessions, listWorkSessionsPage, startWorkSession } from '@/lib/firestore'
import { readPagination } from '@/lib/pagination'
import { requireStaffSession } from '@/lib/api-auth'
import { todayInTimeZone } from '@/lib/date-only'
import { timedApiResponse } from '@/lib/api-timing'

export async function GET(request: Request) {
  return timedApiResponse('GET /api/staff/tasks', async () => {
    const user = await requireStaffSession()
    if (!user) return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
    try {
      const pagination = readPagination(request)
      if (pagination) {
        const page = await listWorkSessionsPage(pagination, user.email)
        return NextResponse.json({ workSessions: page.items, nextCursor: page.nextCursor })
      }
      return NextResponse.json({ workSessions: await listWorkSessions(user.email) })
    } catch (error) {
      console.error(`Failed to load work sessions for ${user.email}:`, error)
      return NextResponse.json({ message: 'Unable to load your work log.' }, { status: 500 })
    }
  })
}

export async function POST() {
  const user = await requireStaffSession()
  if (!user) return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  try {
    const workSession = await startWorkSession(user.email, todayInTimeZone('Asia/Kolkata'))
    return NextResponse.json({ workSession }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'WORK_SESSION_ALREADY_ACTIVE') {
      return NextResponse.json({ message: 'Your work session is already running.' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'WORK_SESSION_ALREADY_COMPLETED') {
      return NextResponse.json({ message: 'Today’s work session has already been completed.' }, { status: 409 })
    }
    console.error(`Failed to start work session for ${user.email}:`, error)
    return NextResponse.json({ message: 'Unable to start work right now.' }, { status: 500 })
  }
}
