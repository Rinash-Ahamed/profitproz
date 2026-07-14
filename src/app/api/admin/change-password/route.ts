import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, createSessionToken, getPasswordValidationMessage, hashPassword, verifyPassword, verifyActiveSessionToken } from '@/lib/auth'
import { getAdminByEmail, getSecuritySettings, logAdminAction, updateAdminPassword } from '@/lib/firestore'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  let body: { currentPassword?: unknown; newPassword?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid password request.' }, { status: 400 }) }

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  const security = await getSecuritySettings()
  const passwordError = getPasswordValidationMessage(newPassword, security)
  if (!currentPassword || currentPassword.length > 1024 || newPassword.length > 1024 || passwordError) return NextResponse.json({ message: passwordError || 'Enter valid password values.' }, { status: 400 })

  const admin = await getAdminByEmail(user.email)
  if (!admin || !await verifyPassword(currentPassword, admin.passwordHash)) return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 401 })

  const updatedAdmin = await updateAdminPassword(admin.id, await hashPassword(newPassword))
  await logAdminAction({ actorEmail: user.email, action: 'ADMIN_PASSWORD_CHANGE', targetId: admin.id, details: 'Admin changed their password.' })
  const maxAge = security.sessionHours * 60 * 60
  const response = NextResponse.json({ ok: true })
  response.cookies.set(authConfig.cookieName, createSessionToken({
    email: updatedAdmin.email,
    role: 'admin',
    sessionVersion: updatedAdmin.sessionVersion,
  }, maxAge), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
    path: '/',
    priority: 'high',
  })
  return response
}
