import { NextResponse } from 'next/server'
import { correctWorkSessionTimes } from '@/lib/firestore'
import { requireAdminSession } from '@/lib/api-auth'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  const { id } = await context.params
  if (!id) return NextResponse.json({ message: 'Work session ID is required.' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid correction request.' }, { status: 400 })
  }

  const input = body as { startedAt?: unknown; endedAt?: unknown }
  if (typeof input.startedAt !== 'string' || (input.endedAt !== null && input.endedAt !== undefined && typeof input.endedAt !== 'string')) {
    return NextResponse.json({ message: 'Enter valid start and end times.' }, { status: 400 })
  }

  const startedAt = new Date(input.startedAt)
  const endedAt = typeof input.endedAt === 'string' && input.endedAt ? new Date(input.endedAt) : undefined
  const futureLimit = Date.now() + 5 * 60_000
  if (
    Number.isNaN(startedAt.valueOf()) ||
    startedAt.valueOf() > futureLimit ||
    (endedAt && (Number.isNaN(endedAt.valueOf()) || endedAt <= startedAt || endedAt.valueOf() > futureLimit)) ||
    (endedAt && endedAt.valueOf() - startedAt.valueOf() > 48 * 60 * 60_000)
  ) {
    return NextResponse.json({ message: 'Times must be valid, chronological, no more than 48 hours apart, and not in the future.' }, { status: 400 })
  }

  try {
    const result = await correctWorkSessionTimes(id, { startedAt, endedAt, actorEmail: user.email })
    return NextResponse.json({ workSession: result.session })
  } catch (error) {
    if (error instanceof Error && error.message === 'WORK_SESSION_NOT_FOUND') {
      return NextResponse.json({ message: 'Work session was not found.' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'WORK_SESSION_NO_CHANGES') {
      return NextResponse.json({ message: 'Change at least one time before saving.' }, { status: 400 })
    }
    console.error(`Failed to correct work session ${id}:`, error)
    return NextResponse.json({ message: 'Unable to correct work-session times.' }, { status: 500 })
  }
}
