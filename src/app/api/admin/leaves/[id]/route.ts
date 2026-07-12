import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { updateLeaveRequestStatus } from '@/lib/firestore'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)
  if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  const body = await request.json() as { status?: unknown; decisionNote?: unknown }
  if (!id || (body.status !== 'approved' && body.status !== 'rejected')) return NextResponse.json({ message: 'A valid leave status is required.' }, { status: 400 })
  return NextResponse.json({ leave: await updateLeaveRequestStatus(id, body.status, typeof body.decisionNote === 'string' ? body.decisionNote : '') })
}
