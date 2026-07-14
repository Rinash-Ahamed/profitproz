import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { getExpenseFieldSettings, logAdminAction, saveExpenseFieldSettings } from '@/lib/firestore'

async function requireAdmin() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  return user?.role === 'admin' ? user : null
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  return NextResponse.json({ settings: await getExpenseFieldSettings() })
}

export async function PUT(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid settings request.' }, { status: 400 }) }
  if (typeof body.cityRequired !== 'boolean' || typeof body.descriptionRequired !== 'boolean' || typeof body.receiptRequired !== 'boolean') {
    return NextResponse.json({ message: 'Invalid expense field settings.' }, { status: 400 })
  }
  const settings = await saveExpenseFieldSettings({ cityRequired: body.cityRequired, descriptionRequired: body.descriptionRequired, receiptRequired: body.receiptRequired })
  await logAdminAction({ actorEmail: user.email, action: 'EXPENSE_SETTINGS_UPDATE', targetId: 'expense-fields', details: 'Expense field settings updated.' })
  return NextResponse.json({ settings })
}
