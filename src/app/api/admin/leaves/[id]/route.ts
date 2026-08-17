import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { deleteLeaveRequestAsAdmin, logAdminAction, updateLeaveRequestStatus } from '@/lib/firestore'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  let body: { status?: unknown; decisionNote?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid leave request.' }, { status: 400 }) }
  if (!id || id.length > 150 || (body.status !== 'approved' && body.status !== 'rejected') || (typeof body.decisionNote === 'string' && body.decisionNote.length > 2000)) return NextResponse.json({ message: 'A valid leave status is required.' }, { status: 400 })
  try {
    const leave = await updateLeaveRequestStatus(id, body.status, typeof body.decisionNote === 'string' ? body.decisionNote : '')
    await logAdminAction({ actorEmail: user.email, action: 'LEAVE_DECISION', targetId: id, details: `Leave request marked ${body.status}.` })
    return NextResponse.json({ leave })
  } catch (error) {
    if (error instanceof Error && error.message === 'LEAVE_NOT_FOUND') return NextResponse.json({ message: 'Leave request was not found.' }, { status: 404 })
    if (error instanceof Error && error.message === 'LEAVE_DECISION_LOCKED') return NextResponse.json({ message: 'This leave request has already been reviewed.' }, { status: 409 })
    console.error(`Failed to update leave request ${id}:`, error)
    return NextResponse.json({ message: 'Unable to update leave request.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 150) return NextResponse.json({ message: 'A valid leave request is required.' }, { status: 400 })

  try {
    const leave = await deleteLeaveRequestAsAdmin(id)
    await logAdminAction({
      actorEmail: user.email,
      action: 'LEAVE_DELETE',
      targetId: id,
      details: `Deleted ${leave.status} leave request for ${leave.staffEmail} (${leave.startDate} to ${leave.endDate}).`,
    })
    return NextResponse.json({ message: 'Leave request deleted.' })
  } catch (error) {
    if (error instanceof Error && error.message === 'LEAVE_NOT_FOUND') return NextResponse.json({ message: 'Leave request was not found.' }, { status: 404 })
    console.error(`Failed to delete leave request ${id}:`, error)
    return NextResponse.json({ message: 'Unable to delete leave request.' }, { status: 500 })
  }
}
