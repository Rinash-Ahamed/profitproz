import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { getStaffByEmail, updateStaffAccount } from '@/lib/firestore'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const { id } = params
  if (!id) {
    return NextResponse.json({ message: 'Staff ID is required.' }, { status: 400 })
  }

  let body: {
    name?: string
    email?: string
    employeeId?: string
    department?: string
    active?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  // If email is being updated, check for uniqueness against other users.
  if (body.email) {
    const existingStaff = await getStaffByEmail(body.email)
    if (existingStaff && existingStaff.id !== id) {
      return NextResponse.json({ message: 'This email address is already in use by another staff member.' }, { status: 409 })
    }
  }

  if (body.employeeId !== undefined && (typeof body.employeeId !== 'string' || !body.employeeId.trim())) {
    return NextResponse.json({ message: 'Employee ID cannot be empty.' }, { status: 400 })
  }

  if (body.department !== undefined && (typeof body.department !== 'string' || !body.department.trim())) {
    return NextResponse.json({ message: 'Department cannot be empty.' }, { status: 400 })
  }

  try {
    const updatedStaff = await updateStaffAccount(id, body)
    return NextResponse.json({ staff: updatedStaff })
  } catch (error) {
    console.error('Failed to update staff:', error)
    return NextResponse.json({ message: 'Failed to update staff member.' }, { status: 500 })
  }
}