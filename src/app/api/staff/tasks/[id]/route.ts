import { NextResponse } from 'next/server'
import { endWorkSession } from '@/lib/firestore'
import { requireStaffSession } from '@/lib/api-auth'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireStaffSession()
  if (!user) return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid work session is required.' }, { status: 400 })
  let body: { notes?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid end-work request.' }, { status: 400 })
  }
  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
  if (notes.length < 3 || notes.length > 2000) {
    return NextResponse.json({ message: 'Add a short summary of the work completed today.' }, { status: 400 })
  }
  try {
    return NextResponse.json({ workSession: await endWorkSession(id, user.email, notes) })
  } catch (error) {
    if (error instanceof Error && error.message === 'WORK_SESSION_NOT_FOUND') return NextResponse.json({ message: 'Work session was not found.' }, { status: 404 })
    if (error instanceof Error && error.message === 'WORK_SESSION_ALREADY_COMPLETED') return NextResponse.json({ message: 'This work session has already ended.' }, { status: 409 })
    console.error(`Failed to end work session ${id}:`, error)
    return NextResponse.json({ message: 'Unable to end work right now.' }, { status: 500 })
  }
}
