import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { getStaffByEmail, updateStaffProfile } from '@/lib/firestore'

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

  return NextResponse.json({ profile: staff })
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Staff access is required.' }, { status: 403 })
  }

  const body = (await request.json()) as { phone?: unknown; address?: unknown; details?: unknown }
  const profile = await updateStaffProfile(user.email, {
    phone: typeof body.phone === 'string' ? body.phone : '',
    address: typeof body.address === 'string' ? body.address : '',
    details: typeof body.details === 'string' ? body.details : '',
  })

  return NextResponse.json({ profile })
}
