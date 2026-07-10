import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { listExpenses, updateExpenseStatus } from '@/lib/firestore'

export async function GET() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  return NextResponse.json({ expenses: await listExpenses() })
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const body = (await request.json()) as { id?: unknown; status?: unknown }

  if (typeof body.id !== 'string' || (body.status !== 'approved' && body.status !== 'rejected')) {
    return NextResponse.json({ message: 'Expense id and status are required.' }, { status: 400 })
  }

  return NextResponse.json({ expense: await updateExpenseStatus(body.id, body.status) })
}
