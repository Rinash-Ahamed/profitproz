import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { listExpenses, listSalaries, listStaffAccounts, saveSalary } from '@/lib/firestore'

export async function GET() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const [staff, salaries, expenses] = await Promise.all([listStaffAccounts(), listSalaries(), listExpenses()])
  const approvedExpensesByStaff = expenses.reduce<Record<string, number>>((totals, expense) => {
    if (expense.status === 'approved') {
      totals[expense.staffEmail] = (totals[expense.staffEmail] || 0) + expense.amount
    }
    return totals
  }, {})

  return NextResponse.json({ staff, salaries, approvedExpensesByStaff })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const body = (await request.json()) as { staffEmail?: unknown; baseSalary?: unknown; notes?: unknown }
  const staffEmail = typeof body.staffEmail === 'string' ? body.staffEmail.trim().toLowerCase() : ''
  const baseSalary = Number(body.baseSalary)
  const notes = typeof body.notes === 'string' ? body.notes : ''

  if (!staffEmail || !Number.isFinite(baseSalary) || baseSalary < 0) {
    return NextResponse.json({ message: 'Staff email and valid salary are required.' }, { status: 400 })
  }

  return NextResponse.json({ salary: await saveSalary({ staffEmail, baseSalary, notes }) })
}
