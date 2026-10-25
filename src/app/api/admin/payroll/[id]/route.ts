import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import { decideMissingAttendance, revertMissingAttendanceDecision } from '@/lib/firestore'
import { parseDateOnly } from '@/lib/date-only'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  let body: { status?: unknown; missingAttendanceDate?: unknown; decision?: unknown; action?: unknown }
  try {
    const input: unknown = await request.json()
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_BODY')
    body = input
  } catch { return NextResponse.json({ message: 'Invalid payroll request.' }, { status: 400 }) }
  if (!id || id.length > 200) return NextResponse.json({ message: 'A valid payroll record is required.' }, { status: 400 })
  if ('status' in body) return NextResponse.json({ message: 'Payroll is calculation-only. Record payroll payments separately as an Admin Expense.' }, { status: 400 })
  const date = body.missingAttendanceDate
  const reverting = body.action === 'revert_missing_attendance'
  const decision = body.decision
  if (typeof date !== 'string' || !parseDateOnly(date) || (!reverting && (body.action !== undefined || (decision !== 'lop' && decision !== 'ignored')))) {
    return NextResponse.json({ message: 'Select a valid missing-attendance date and action.' }, { status: 400 })
  }
  try {
    const payroll = reverting
      ? await revertMissingAttendanceDecision(id, date, user.email)
      : await decideMissingAttendance(id, date, decision as 'lop' | 'ignored', user.email)
    return NextResponse.json({ payroll })
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYROLL_NOT_FOUND') return NextResponse.json({ message: 'Payroll record was not found.' }, { status: 404 })
    if (error instanceof Error && error.message === 'MISSING_ATTENDANCE_DATE_NOT_FOUND') return NextResponse.json({ message: 'This date is no longer missing attendance. Refresh payroll.' }, { status: 409 })
    if (error instanceof Error && error.message === 'MISSING_ATTENDANCE_ALREADY_DECIDED') return NextResponse.json({ message: 'This missing-attendance date has already been reviewed.' }, { status: 409 })
    if (error instanceof Error && error.message === 'MISSING_ATTENDANCE_NOT_DECIDED') return NextResponse.json({ message: 'This missing-attendance date is already pending review.' }, { status: 409 })
    console.error(`Failed to update missing attendance for payroll ${id}:`, error)
    return NextResponse.json({ message: 'Unable to update the missing-attendance decision.' }, { status: 500 })
  }
}
