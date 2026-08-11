import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import { transitionPayrollStatus } from '@/lib/firestore'
import type { PayrollStatus } from '@/lib/payroll'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  let body: { status?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid payroll status request.' }, { status: 400 }) }
  const status = body.status
  if (!id || id.length > 200 || (status !== 'calculated' && status !== 'approved' && status !== 'paid')) {
    return NextResponse.json({ message: 'A valid payroll status is required.' }, { status: 400 })
  }
  try {
    return NextResponse.json({ payroll: await transitionPayrollStatus(id, status as PayrollStatus, user.email) })
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYROLL_NOT_FOUND') return NextResponse.json({ message: 'Payroll record was not found.' }, { status: 404 })
    if (error instanceof Error && error.message === 'INVALID_PAYROLL_TRANSITION') return NextResponse.json({ message: 'Payroll status must follow Draft → Calculated → Approved → Paid.' }, { status: 409 })
    console.error(`Failed to update payroll ${id}:`, error)
    return NextResponse.json({ message: 'Unable to update payroll status.' }, { status: 500 })
  }
}
