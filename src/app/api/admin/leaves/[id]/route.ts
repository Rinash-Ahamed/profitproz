import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { logAdminAction, updateLeaveRequestStatus } from '@/lib/firestore'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  let body: { status?: unknown; decisionNote?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid leave request.' }, { status: 400 }) }
  if (!id || id.length > 150 || (body.status !== 'approved' && body.status !== 'rejected') || (typeof body.decisionNote === 'string' && body.decisionNote.length > 2000)) return NextResponse.json({ message: 'A valid leave status is required.' }, { status: 400 })
  const leave = await updateLeaveRequestStatus(id, body.status, typeof body.decisionNote === 'string' ? body.decisionNote : '')
  await logAdminAction({ actorEmail: user.email, action: 'LEAVE_DECISION', targetId: id, details: `Leave request marked ${body.status}.` })
  return NextResponse.json({ leave })
}
