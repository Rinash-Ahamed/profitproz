import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, createSessionToken, hashPassword, verifyPassword, verifySessionToken } from '@/lib/auth'
import { completeStaffOnboarding, getStaffByEmail, updateStaffPassword } from '@/lib/firestore'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Staff access is required.' }, { status: 403 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid password request.' }, { status: 400 })
  }

  const { currentPassword, newPassword, phone, address, details } = body as { currentPassword?: unknown; newPassword?: unknown; phone?: unknown; address?: unknown; details?: unknown }

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return NextResponse.json({ message: 'Current and new password are required.' }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ message: 'New password must be at least 8 characters.' }, { status: 400 })
  }

  const profile = {
    phone: typeof phone === 'string' ? phone.trim() : '',
    address: typeof address === 'string' ? address.trim() : '',
    details: typeof details === 'string' ? details.trim() : '',
  }

  const staff = await getStaffByEmail(user.email)

  if (!staff || !verifyPassword(currentPassword, staff.passwordHash)) {
    return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 401 })
  }

  if (staff.mustChangePassword) {
    if (!/^[0-9]{7,15}$/.test(profile.phone) || !profile.address || !profile.details) {
      return NextResponse.json({ message: 'Enter a valid phone number (7 to 15 digits), address, and details.' }, { status: 400 })
    }
    await completeStaffOnboarding(staff.id, { passwordHash: hashPassword(newPassword), ...profile })
  } else {
    await updateStaffPassword(staff.id, hashPassword(newPassword))
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(
    authConfig.cookieName,
    createSessionToken({
      email: user.email,
      role: 'staff',
      mustChangePassword: false,
    }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: authConfig.maxAge,
      path: '/',
    }
  )

  return response
}
