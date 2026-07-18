import { NextResponse } from 'next/server'
import { requireStaffSession } from '@/lib/api-auth'
import { deletePendingLeaveRequest } from '@/lib/firestore'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireStaffSession()
  if (!user || user.role !== 'staff') return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })

  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid leave request ID is required.' }, { status: 400 })

  try {
    await deletePendingLeaveRequest(id, user.email)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'LEAVE_NOT_FOUND') return NextResponse.json({ message: 'Leave request was not found.' }, { status: 404 })
    if (error instanceof Error && error.message === 'LEAVE_NOT_PENDING') return NextResponse.json({ message: 'Only Pending leave requests can be withdrawn.' }, { status: 409 })
    console.error(`Failed to withdraw leave request ${id}:`, error)
    return NextResponse.json({ message: 'Failed to withdraw leave request.' }, { status: 500 })
  }
}
