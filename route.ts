import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, hashPassword, verifySessionToken } from '@/lib/auth'
import { updateStaffPasswordAndFlag } from '@/lib/firestore'

const INITIAL_STAFF_PASSWORD = 'Welcome@123'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const staffId = params.id
  if (!staffId) {
    return NextResponse.json({ message: 'Staff ID is required.' }, { status: 400 })
  }

  try {
    const newPasswordHash = hashPassword(INITIAL_STAFF_PASSWORD)
    await updateStaffPasswordAndFlag(staffId, newPasswordHash)

    return NextResponse.json({
      message: 'Password reset successfully.',
      newPassword: INITIAL_STAFF_PASSWORD,
    })
  } catch (error) {
    console.error(`Failed to reset password for staff ${staffId}:`, error)
    return NextResponse.json({ message: 'Failed to reset password.' }, { status: 500 })
  }
}