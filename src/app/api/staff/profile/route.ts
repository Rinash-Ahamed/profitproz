import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { getStaffByEmail, toPublicStaff, updateStaffProfile } from '@/lib/firestore'

export async function GET() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'staff' })

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Staff access is required.' }, { status: 403 })
  }

  const staff = await getStaffByEmail(user.email)

  if (!staff) {
    return NextResponse.json({ message: 'Profile not found.' }, { status: 404 })
  }

  return NextResponse.json({ profile: toPublicStaff(staff) })
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'staff' })

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Staff access is required.' }, { status: 403 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid profile request.' }, { status: 400 })
  }

  const staff = await getStaffByEmail(user.email)

  if (!staff) {
    return NextResponse.json({ message: 'Profile not found.' }, { status: 404 })
  }

  const input = body as { phone?: unknown; address?: unknown; details?: unknown; emergencyContactName?: unknown; emergencyContactPhone?: unknown }
  const profileInput = {
    phone: typeof input.phone === 'string' ? input.phone.trim() : '',
    address: typeof input.address === 'string' ? input.address.trim() : '',
    details: typeof input.details === 'string' ? input.details.trim() : '',
    emergencyContactName: typeof input.emergencyContactName === 'string' ? input.emergencyContactName.trim() : '',
    emergencyContactPhone: typeof input.emergencyContactPhone === 'string' ? input.emergencyContactPhone.trim() : '',
  }

  if (!/^[0-9]{7,15}$/.test(profileInput.phone) || !/^[0-9]{7,15}$/.test(profileInput.emergencyContactPhone) || !profileInput.address || profileInput.address.length > 500 || !profileInput.details || profileInput.details.length > 2000 || !profileInput.emergencyContactName || profileInput.emergencyContactName.length > 100) {
    return NextResponse.json({ message: 'Enter valid contact, emergency contact, address, and details fields.' }, { status: 400 })
  }

  const profile = await updateStaffProfile(staff.id, {
    ...profileInput,
  })

  return NextResponse.json({ profile: toPublicStaff(profile) })
}
