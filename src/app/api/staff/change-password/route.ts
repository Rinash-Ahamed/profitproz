import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, createSessionToken, getPasswordValidationMessage, hashPassword, verifyPassword, verifyActiveSessionToken } from '@/lib/auth'
import { completeStaffOnboarding, getSecuritySettings, getStaffByEmail, updateStaffPassword } from '@/lib/firestore'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'staff', allowMustChangePassword: true })

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Staff access is required.' }, { status: 403 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid password request.' }, { status: 400 })
  }

  const { currentPassword, newPassword, phone, address, details, emergencyContactName, emergencyContactPhone } = body as { currentPassword?: unknown; newPassword?: unknown; phone?: unknown; address?: unknown; details?: unknown; emergencyContactName?: unknown; emergencyContactPhone?: unknown }

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || currentPassword.length > 1024 || newPassword.length > 1024) {
    return NextResponse.json({ message: 'Current and new password are required.' }, { status: 400 })
  }

  const security = await getSecuritySettings()
  const passwordError = getPasswordValidationMessage(newPassword, security)
  if (passwordError) return NextResponse.json({ message: passwordError }, { status: 400 })

  const profile = {
    phone: typeof phone === 'string' ? phone.trim() : '',
    address: typeof address === 'string' ? address.trim() : '',
    details: typeof details === 'string' ? details.trim() : '',
    emergencyContactName: typeof emergencyContactName === 'string' ? emergencyContactName.trim() : '',
    emergencyContactPhone: typeof emergencyContactPhone === 'string' ? emergencyContactPhone.trim() : '',
  }

  const staff = await getStaffByEmail(user.email)

  if (!staff || !await verifyPassword(currentPassword, staff.passwordHash)) {
    return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 401 })
  }

  let updatedStaff: Awaited<ReturnType<typeof updateStaffPassword>>
  if (staff.mustChangePassword) {
    if (!/^[0-9]{7,15}$/.test(profile.phone) || !/^[0-9]{7,15}$/.test(profile.emergencyContactPhone) || !profile.address || profile.address.length > 500 || !profile.details || profile.details.length > 2000 || !profile.emergencyContactName || profile.emergencyContactName.length > 100) {
      return NextResponse.json({ message: 'Complete your contact, emergency contact, address, and details fields.' }, { status: 400 })
    }
    updatedStaff = await completeStaffOnboarding(staff.id, { passwordHash: await hashPassword(newPassword), ...profile })
  } else {
    updatedStaff = await updateStaffPassword(staff.id, await hashPassword(newPassword))
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(
    authConfig.cookieName,
    createSessionToken({
      email: user.email,
      role: 'staff',
      mustChangePassword: false,
      sessionVersion: updatedStaff.sessionVersion,
    }, security.sessionHours * 60 * 60),
    {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: security.sessionHours * 60 * 60,
      path: '/',
      priority: 'high',
    }
  )

  return response
}
