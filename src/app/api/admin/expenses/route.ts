import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { createExpense, listExpenses, listExpensesPage, logAdminAction } from '@/lib/firestore'
import { readPagination } from '@/lib/pagination'
import { parseDateOnly } from '@/lib/date-only'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const pagination = readPagination(request)
  if (pagination) { const page = await listExpensesPage(pagination); return NextResponse.json({ expenses: page.items, nextCursor: page.nextCursor }) }
  return NextResponse.json({ expenses: await listExpenses() })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  let body: { city?: unknown; expenseType?: unknown; customExpenseType?: unknown; description?: unknown; amount?: unknown; receiptUrl?: unknown; expenseDate?: unknown; adminName?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid expense request.' }, { status: 400 })
  }

  const city = typeof body.city === 'string' ? body.city.trim() : ''
  const expenseType = body.expenseType === 'travel' || body.expenseType === 'food' || body.expenseType === 'fuel' || body.expenseType === 'other' ? body.expenseType : ''
  const customExpenseType = typeof body.customExpenseType === 'string' ? body.customExpenseType.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const amount = Number(body.amount)
  const receiptUrl = typeof body.receiptUrl === 'string' ? body.receiptUrl.trim() : ''
  const expenseDate = typeof body.expenseDate === 'string' ? body.expenseDate : ''
  const adminName = typeof body.adminName === 'string' ? body.adminName.trim() : ''

  if (!adminName || adminName.length > 160 || /\d/.test(adminName) || !expenseType || (expenseType === 'other' && (!customExpenseType || customExpenseType.length > 100)) || (expenseType !== 'other' && customExpenseType.length > 0) || !parseDateOnly(expenseDate) || !Number.isFinite(amount) || amount <= 0 || amount > 10_000_000 || city.length > 100 || description.length > 2000 || receiptUrl.length > 2048) {
    return NextResponse.json({ message: 'Enter a valid Admin name, expense date, type, and amount.' }, { status: 400 })
  }
  if (receiptUrl) {
    try {
      const parsed = new URL(receiptUrl)
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('UNSAFE_URL')
    } catch {
      return NextResponse.json({ message: 'Enter a valid HTTPS receipt link.' }, { status: 400 })
    }
  }

  try {
    const expenseLabel = expenseType === 'other' ? customExpenseType : expenseType.charAt(0).toUpperCase() + expenseType.slice(1)
    const title = `${expenseLabel} expense`
    const expense = await createExpense({
      staffEmail: user.email,
      staffName: adminName,
      title,
      city,
      expenseType,
      customExpenseType,
      description,
      amount,
      receiptName: receiptUrl ? 'External receipt link' : '',
      receiptUrl,
      submittedByRole: 'admin',
      status: 'approved',
      expenseDate,
    })
    await logAdminAction({ actorEmail: user.email, action: 'ADMIN_EXPENSE_CREATE', targetId: expense.id, details: `Admin recorded a ${expenseLabel} expense for ${amount}.` })
    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error('Failed to record admin expense:', error)
    return NextResponse.json({ message: 'Failed to record expense.' }, { status: 500 })
  }
}
