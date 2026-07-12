import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { updateTimesheetStatus } from '@/lib/firestore'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ message: 'Timesheet ID is required.' }, { status: 400 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid timesheet request.' }, { status: 400 })
  }

  const { status, decisionNote } = body as { status?: unknown; decisionNote?: unknown }

  if (status !== 'approved' && status !== 'rejected') {
    return NextResponse.json({ message: 'A valid timesheet status is required.' }, { status: 400 })
  }

  try {
    return NextResponse.json({ timesheet: await updateTimesheetStatus(id, status, typeof decisionNote === 'string' ? decisionNote : '') })
  } catch (error) {
    console.error(`Failed to update timesheet ${id}:`, error)
    return NextResponse.json({ message: 'Failed to update timesheet.' }, { status: 500 })
  }
}
