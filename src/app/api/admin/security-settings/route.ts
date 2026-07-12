import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { getSecuritySettings, saveSecuritySettings } from '@/lib/firestore'

async function requireAdmin() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)
  return user?.role === 'admin'
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  return NextResponse.json({ settings: await getSecuritySettings() })
}

export async function PUT(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const body = await request.json() as Record<string, unknown>
  const sessionHours = Number(body.sessionHours)
  const minPasswordLength = Number(body.minPasswordLength)
  if (![1, 4, 8, 12, 24].includes(sessionHours) || !Number.isInteger(minPasswordLength) || minPasswordLength < 8 || minPasswordLength > 64 || typeof body.requireUppercase !== 'boolean' || typeof body.requireNumber !== 'boolean') return NextResponse.json({ message: 'Invalid security settings.' }, { status: 400 })
  return NextResponse.json({ settings: await saveSecuritySettings({ sessionHours: sessionHours as 1 | 4 | 8 | 12 | 24, minPasswordLength, requireUppercase: body.requireUppercase, requireNumber: body.requireNumber }) })
}
