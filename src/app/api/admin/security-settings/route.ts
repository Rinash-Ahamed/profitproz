import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { getSecuritySettings, logAdminAction, saveSecuritySettings } from '@/lib/firestore'

async function requireAdmin() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  return user?.role === 'admin' ? user : null
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  return NextResponse.json({ settings: await getSecuritySettings() })
}

export async function PUT(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid settings request.' }, { status: 400 }) }
  const sessionHours = Number(body.sessionHours)
  const minPasswordLength = Number(body.minPasswordLength)
  if (![1, 4, 8, 12, 24].includes(sessionHours) || !Number.isInteger(minPasswordLength) || minPasswordLength < 12 || minPasswordLength > 64 || typeof body.requireUppercase !== 'boolean' || typeof body.requireNumber !== 'boolean') return NextResponse.json({ message: 'Invalid security settings.' }, { status: 400 })
  const settings = await saveSecuritySettings({ sessionHours: sessionHours as 1 | 4 | 8 | 12 | 24, minPasswordLength, requireUppercase: body.requireUppercase, requireNumber: body.requireNumber })
  await logAdminAction({ actorEmail: user.email, action: 'SECURITY_SETTINGS_UPDATE', targetId: 'security', details: 'Security settings updated.' })
  return NextResponse.json({ settings })
}
