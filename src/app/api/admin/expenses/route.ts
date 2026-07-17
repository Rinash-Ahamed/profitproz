import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { listExpenses, listExpensesPage } from '@/lib/firestore'
import { readPagination } from '@/lib/pagination'

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
