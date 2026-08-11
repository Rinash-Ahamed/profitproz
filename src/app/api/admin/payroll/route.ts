import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import { generatePayrollRecords, listPayrollRecords } from '@/lib/firestore'
import { isPayrollMonthAvailable, parsePayrollMonth, PAYROLL_START_MONTH } from '@/lib/payroll'

export async function GET(request: Request) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const month = new URL(request.url).searchParams.get('month') || ''
  if (!parsePayrollMonth(month)) return NextResponse.json({ message: 'Select a valid payroll month.' }, { status: 400 })
  return NextResponse.json({ payroll: await listPayrollRecords(month) })
}

export async function POST(request: Request) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  let body: { month?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid payroll request.' }, { status: 400 }) }
  const month = typeof body.month === 'string' ? body.month : ''
  if (!parsePayrollMonth(month)) return NextResponse.json({ message: 'Select a valid payroll month.' }, { status: 400 })
  if (!isPayrollMonthAvailable(month)) return NextResponse.json({ message: `Payroll is available from ${PAYROLL_START_MONTH} through the current month.` }, { status: 409 })
  try {
    return NextResponse.json({ payroll: await generatePayrollRecords(month, user.email) }, { status: 201 })
  } catch (error) {
    console.error(`Failed to generate payroll for ${month}:`, error)
    return NextResponse.json({ message: 'Unable to generate payroll.' }, { status: 500 })
  }
}
