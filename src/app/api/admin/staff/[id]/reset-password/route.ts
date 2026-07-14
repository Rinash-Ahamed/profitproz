import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { authConfig, hashPassword, verifyActiveSessionToken } from '@/lib/auth'
import { getStaffById, logAdminAction, updateStaffPasswordAndFlag } from '@/lib/firestore'

function createTemporaryPassword() {
  return crypto.randomBytes(24).toString('base64url')
}

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(_request: Request, context: RouteContext) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const { id: staffId } = await context.params

  if (!staffId) {
    return NextResponse.json({ message: 'Staff ID is required.' }, { status: 400 })
  }

  try {
    const temporaryPassword = createTemporaryPassword()
    const staffToReset = await getStaffById(staffId)

    if (!staffToReset) {
      return NextResponse.json({ message: 'Staff member was not found.' }, { status: 404 })
    }

    await updateStaffPasswordAndFlag(staffId, await hashPassword(temporaryPassword))
    await logAdminAction({
      actorEmail: user.email,
      action: 'PASSWORD_RESET',
      targetId: staffId,
      details: `Admin reset password for staff member: ${staffToReset.name} (${staffToReset.email}).`,
    })

    return NextResponse.json({
      message: 'Password reset successfully.',
      initialPassword: temporaryPassword,
    })
  } catch (error) {
    console.error(`Failed to reset password for staff ${staffId}:`, error)
    return NextResponse.json({ message: 'Failed to reset password.' }, { status: 500 })
  }
}
