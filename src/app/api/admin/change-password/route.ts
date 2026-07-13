import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, getPasswordValidationMessage, hashPassword, verifyPassword, verifySessionToken } from '@/lib/auth'
import { getAdminByEmail, getSecuritySettings, logAdminAction, updateAdminPassword } from '@/lib/firestore'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)
  if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  let body: { currentPassword?: unknown; newPassword?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid password request.' }, { status: 400 }) }

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  const passwordError = getPasswordValidationMessage(newPassword, await getSecuritySettings())
  if (!currentPassword || passwordError) return NextResponse.json({ message: passwordError || 'Enter your current password.' }, { status: 400 })

  const admin = await getAdminByEmail(user.email)
  if (!admin || !await verifyPassword(currentPassword, admin.passwordHash)) return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 401 })

  await updateAdminPassword(admin.id, await hashPassword(newPassword))
  await logAdminAction({ actorEmail: user.email, action: 'ADMIN_PASSWORD_CHANGE', targetId: admin.id, details: 'Admin changed their password.' })
  return NextResponse.json({ ok: true })
}
