import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { getExpenseFieldSettings, saveExpenseFieldSettings } from '@/lib/firestore'

async function requireAdmin() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)
  return user?.role === 'admin' ? user : null
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  return NextResponse.json({ settings: await getExpenseFieldSettings() })
}

export async function PUT(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const body = await request.json() as Record<string, unknown>
  if (typeof body.cityRequired !== 'boolean' || typeof body.descriptionRequired !== 'boolean' || typeof body.receiptRequired !== 'boolean') {
    return NextResponse.json({ message: 'Invalid expense field settings.' }, { status: 400 })
  }
  return NextResponse.json({ settings: await saveExpenseFieldSettings({ cityRequired: body.cityRequired, descriptionRequired: body.descriptionRequired, receiptRequired: body.receiptRequired }) })
}
