import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { getStaffByEmail, toPublicStaff, updateStaffProfile } from '@/lib/firestore'

export async function GET() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

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
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

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

  const input = body as { phone?: unknown; address?: unknown; details?: unknown }
  const profile = await updateStaffProfile(staff.id, {
    phone: typeof input.phone === 'string' ? input.phone : '',
    address: typeof input.address === 'string' ? input.address : '',
    details: typeof input.details === 'string' ? input.details : '',
  })

  return NextResponse.json({ profile: toPublicStaff(profile) })
}
