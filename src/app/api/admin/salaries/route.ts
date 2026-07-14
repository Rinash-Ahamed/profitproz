import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { listExpenses, listSalaries, listStaffAccounts, logAdminAction, saveSalary, toPublicStaff } from '@/lib/firestore'

export async function GET() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })

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

  return NextResponse.json({ staff: staff.map(toPublicStaff), salaries, approvedExpensesByStaff })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid salary request.' }, { status: 400 })
  }

  const input = body as { staffEmail?: unknown; baseSalary?: unknown; notes?: unknown }
  const staffEmail = typeof input.staffEmail === 'string' ? input.staffEmail.trim().toLowerCase() : ''
  const baseSalary = Number(input.baseSalary)
  const notes = typeof input.notes === 'string' ? input.notes : ''

  if (!staffEmail || staffEmail.length > 254 || !Number.isFinite(baseSalary) || baseSalary < 0 || baseSalary > 100_000_000 || notes.length > 2000) {
    return NextResponse.json({ message: 'Staff email and valid salary are required.' }, { status: 400 })
  }

  const staff = (await listStaffAccounts()).find((record) => record.email === staffEmail)

  if (!staff) {
    return NextResponse.json({ message: 'Staff member was not found.' }, { status: 404 })
  }

  const salary = await saveSalary(staff.id, { staffEmail, baseSalary, notes })
  await logAdminAction({ actorEmail: user.email, action: 'SALARY_UPDATE', targetId: staff.id, details: `Salary updated for ${staff.email}.` })
  return NextResponse.json({ salary })
}
