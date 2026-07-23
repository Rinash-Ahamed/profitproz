import { NextResponse } from 'next/server'
import { getSecuritySettings, logAdminAction, saveSecuritySettings } from '@/lib/firestore'
import { requireAdminSession as requireAdmin } from '@/lib/api-auth'

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  try {
    return NextResponse.json({ settings: await getSecuritySettings() })
  } catch (error) {
    console.error('Failed to load security settings:', error)
    return NextResponse.json({ message: 'Failed to load security settings.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid settings request.' }, { status: 400 }) }
  const sessionHours = Number(body.sessionHours)
  const minPasswordLength = Number(body.minPasswordLength)
  if (![1, 4, 8, 12, 24].includes(sessionHours) || !Number.isInteger(minPasswordLength) || minPasswordLength < 8 || minPasswordLength > 64 || typeof body.requireUppercase !== 'boolean' || typeof body.requireNumber !== 'boolean') return NextResponse.json({ message: 'Invalid security settings.' }, { status: 400 })
  try {
    const settings = await saveSecuritySettings({ sessionHours: sessionHours as 1 | 4 | 8 | 12 | 24, minPasswordLength, requireUppercase: body.requireUppercase, requireNumber: body.requireNumber })
    void logAdminAction({ actorEmail: user.email, action: 'SECURITY_SETTINGS_UPDATE', targetId: 'security', details: 'Security settings updated.' })
      .catch((error) => console.error('Security settings were saved, but audit logging failed:', error))
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Failed to save security settings:', error)
    return NextResponse.json({ message: 'Security settings could not be saved to Firestore.' }, { status: 500 })
  }
}
