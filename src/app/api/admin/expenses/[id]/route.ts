import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { correctExpense, deleteAdminExpense, logAdminAction, markExpensePaid, updateExpenseStatus } from '@/lib/firestore'
import { parseDateOnly } from '@/lib/date-only'
import { ADMIN_NAMES } from '@/lib/admin-options'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ message: 'Expense ID is required.' }, { status: 400 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid expense request.' }, { status: 400 })
  }

  const { status, decisionNote, action } = body as { status?: unknown; decisionNote?: unknown; action?: unknown }

  if (action === 'correct') {
    const correction = body as {
      staffName?: unknown
      expenseDate?: unknown
      expenseType?: unknown
      customExpenseType?: unknown
      city?: unknown
      description?: unknown
      amount?: unknown
      receiptUrl?: unknown
    }
    const staffName = typeof correction.staffName === 'string' ? correction.staffName.trim() : ''
    const expenseDate = typeof correction.expenseDate === 'string' ? correction.expenseDate : ''
    const expenseType = correction.expenseType === 'travel' || correction.expenseType === 'food' || correction.expenseType === 'fuel' || correction.expenseType === 'other' ? correction.expenseType : ''
    const customExpenseType = typeof correction.customExpenseType === 'string' ? correction.customExpenseType.trim() : ''
    const city = typeof correction.city === 'string' ? correction.city.trim() : ''
    const description = typeof correction.description === 'string' ? correction.description.trim() : ''
    const amount = Number(correction.amount)
    const receiptUrl = typeof correction.receiptUrl === 'string' ? correction.receiptUrl.trim() : ''

    if (
      (staffName && !(ADMIN_NAMES as readonly string[]).includes(staffName)) ||
      !parseDateOnly(expenseDate) ||
      !expenseType ||
      (expenseType === 'other' && (!customExpenseType || customExpenseType.length > 100)) ||
      (expenseType !== 'other' && customExpenseType.length > 0) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 10_000_000 ||
      city.length > 100 ||
      description.length > 2000 ||
      receiptUrl.length > 2048
    ) {
      return NextResponse.json({ message: 'Enter valid corrected expense details.' }, { status: 400 })
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
      const expense = await correctExpense(id, { actorEmail: user.email, staffName, expenseDate, expenseType, customExpenseType, city, description, amount, receiptUrl })
      return NextResponse.json({ expense })
    } catch (error) {
      if (error instanceof Error && error.message === 'EXPENSE_NOT_FOUND') return NextResponse.json({ message: 'Expense was not found.' }, { status: 404 })
      if (error instanceof Error && error.message === 'EXPENSE_ALREADY_PAID') return NextResponse.json({ message: 'Paid expenses are locked and cannot be corrected.' }, { status: 409 })
      if (error instanceof Error && error.message === 'ADMIN_NAME_REQUIRED') return NextResponse.json({ message: 'Select the Admin who recorded this expense.' }, { status: 400 })
      if (error instanceof Error && error.message === 'EXPENSE_NO_CHANGES') return NextResponse.json({ message: 'Change at least one expense field before saving.' }, { status: 400 })
      console.error(`Failed to correct expense ${id}:`, error)
      return NextResponse.json({ message: 'Failed to correct expense.' }, { status: 500 })
    }
  }

  if (action === 'mark_paid') {
    try {
      const expense = await markExpensePaid(id)
      await logAdminAction({ actorEmail: user.email, action: 'EXPENSE_PAYMENT_COMPLETE', targetId: id, details: `Expense payment marked complete for ${expense.staffEmail}.` })
      return NextResponse.json({ expense })
    } catch (error) {
      if (error instanceof Error && error.message === 'EXPENSE_NOT_FOUND') return NextResponse.json({ message: 'Expense was not found.' }, { status: 404 })
      if (error instanceof Error && error.message === 'EXPENSE_NOT_APPROVED') return NextResponse.json({ message: 'Approve the expense before marking it paid.' }, { status: 409 })
      console.error(`Failed to mark expense ${id} paid:`, error)
      return NextResponse.json({ message: 'Failed to mark expense paid.' }, { status: 500 })
    }
  }

  if ((status !== 'approved' && status !== 'rejected') || (typeof decisionNote === 'string' && decisionNote.length > 2000)) {
    return NextResponse.json({ message: 'A valid expense status is required.' }, { status: 400 })
  }

  try {
    const expense = await updateExpenseStatus(id, status, typeof decisionNote === 'string' ? decisionNote : '')
    await logAdminAction({ actorEmail: user.email, action: 'EXPENSE_DECISION', targetId: id, details: `Expense marked ${status}.` })
    return NextResponse.json({ expense })
  } catch (error) {
    console.error(`Failed to update expense ${id}:`, error)
    return NextResponse.json({ message: 'Failed to update expense.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid expense ID is required.' }, { status: 400 })

  try {
    await deleteAdminExpense(id, user.email)
    await logAdminAction({ actorEmail: user.email, action: 'ADMIN_EXPENSE_WITHDRAW', targetId: id, details: 'Admin withdrew their recorded expense.' })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'EXPENSE_NOT_FOUND') return NextResponse.json({ message: 'Your Admin expense was not found.' }, { status: 404 })
    console.error(`Failed to withdraw Admin expense ${id}:`, error)
    return NextResponse.json({ message: 'Failed to withdraw Admin expense.' }, { status: 500 })
  }
}
