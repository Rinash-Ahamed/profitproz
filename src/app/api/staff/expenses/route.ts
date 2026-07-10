import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { createExpense, listExpenses } from '@/lib/firestore'
import { getExpenseNotificationHtml, sendMail } from '@/lib/mail'

export async function GET() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Staff access is required.' }, { status: 403 })
  }

  return NextResponse.json({ expenses: await listExpenses(user.email) })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Staff access is required.' }, { status: 403 })
  }

  const body = (await request.json()) as { title?: unknown; amount?: unknown; notes?: unknown }
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const amount = Number(body.amount)
  const notes = typeof body.notes === 'string' ? body.notes : ''

  if (!title || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ message: 'Expense title and a valid amount are required.' }, { status: 400 })
  }

  const expense = await createExpense({ staffEmail: user.email, title, amount, notes })

  await sendMail({
    fromName: 'ProfitPro Portal',
    to: 'admin@profitproz.com',
    replyTo: user.email,
    subject: `Expense submitted by ${user.email}`,
    text: `${user.email} submitted ${title} for ${amount}. Notes: ${notes || 'N/A'}`,
    html: getExpenseNotificationHtml({ staffEmail: user.email, title, amount, notes }),
  })

  return NextResponse.json({ expense })
}
