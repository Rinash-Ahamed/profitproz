import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { logAdminAction, updateExpenseStatus } from '@/lib/firestore'

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

  const { status, decisionNote } = body as { status?: unknown; decisionNote?: unknown }

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
