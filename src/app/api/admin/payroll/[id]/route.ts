import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import { decideMissingAttendance, transitionPayrollStatus } from '@/lib/firestore'
import type { MissingAttendanceDecision, PayrollStatus } from '@/lib/payroll'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  let body: { status?: unknown; missingAttendanceDate?: unknown; decision?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid payroll status request.' }, { status: 400 }) }
  if (!id || id.length > 200) return NextResponse.json({ message: 'A valid payroll record is required.' }, { status: 400 })
  const missingAttendanceDate = body.missingAttendanceDate
  const decision = body.decision
  if (typeof missingAttendanceDate === 'string' && (decision === 'lop' || decision === 'ignored')) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(missingAttendanceDate)) return NextResponse.json({ message: 'A valid missing-attendance date is required.' }, { status: 400 })
    try {
      return NextResponse.json({ payroll: await decideMissingAttendance(id, missingAttendanceDate, decision as MissingAttendanceDecision, user.email) })
    } catch (error) {
      if (error instanceof Error && error.message === 'PAYROLL_NOT_FOUND') return NextResponse.json({ message: 'Payroll record was not found.' }, { status: 404 })
      if (error instanceof Error && error.message === 'PAYROLL_DECISION_LOCKED') return NextResponse.json({ message: 'Missing attendance can only be decided while payroll is in Draft.' }, { status: 409 })
      if (error instanceof Error && error.message === 'MISSING_ATTENDANCE_DATE_NOT_FOUND') return NextResponse.json({ message: 'This date is no longer missing attendance. Refresh the Draft.' }, { status: 409 })
      if (error instanceof Error && error.message === 'MISSING_ATTENDANCE_ALREADY_DECIDED') return NextResponse.json({ message: 'This missing-attendance date has already been reviewed.' }, { status: 409 })
      console.error(`Failed to decide missing attendance for payroll ${id}:`, error)
      return NextResponse.json({ message: 'Unable to save the missing-attendance decision.' }, { status: 500 })
    }
  }
  const status = body.status
  if (status !== 'calculated' && status !== 'approved' && status !== 'paid') {
    return NextResponse.json({ message: 'A valid payroll status is required.' }, { status: 400 })
  }
  try {
    return NextResponse.json({ payroll: await transitionPayrollStatus(id, status as PayrollStatus, user.email) })
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYROLL_NOT_FOUND') return NextResponse.json({ message: 'Payroll record was not found.' }, { status: 404 })
    if (error instanceof Error && error.message === 'INVALID_PAYROLL_TRANSITION') return NextResponse.json({ message: 'Payroll status must follow Draft → Calculated → Approved → Paid.' }, { status: 409 })
    if (error instanceof Error && error.message === 'PENDING_MISSING_ATTENDANCE_DECISIONS') return NextResponse.json({ message: 'Review all missing-attendance dates before confirming payroll.' }, { status: 409 })
    if (error instanceof Error && error.message === 'PAYROLL_MONTH_INCOMPLETE') return NextResponse.json({ message: 'Payroll can be approved only after the complete month has been calculated.' }, { status: 409 })
    console.error(`Failed to update payroll ${id}:`, error)
    return NextResponse.json({ message: 'Unable to update payroll status.' }, { status: 500 })
  }
}
