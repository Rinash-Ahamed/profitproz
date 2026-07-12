import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { deleteStaffAccount, getStaffById, logAdminAction, toPublicStaff, updateStaffAccount } from '@/lib/firestore'

type RouteContext = {
  params: Promise<{ id: string }>
}

async function requireAdmin() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  return user?.role === 'admin' ? user : null
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAdmin()

  if (!user) {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ message: 'Employee ID is required.' }, { status: 400 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid staff update request.' }, { status: 400 })
  }

  const input = body as {
    name?: unknown
    email?: unknown
    employeeId?: unknown
    department?: unknown
    active?: unknown
  }
  const updates: Parameters<typeof updateStaffAccount>[1] = {}

  if (typeof input.name === 'string') {
    const name = input.name.trim()
    if (!name) return NextResponse.json({ message: 'Employee name cannot be empty.' }, { status: 400 })
    updates.name = name
  }

  if (typeof input.email === 'string') {
    const email = input.email.trim().toLowerCase()
    if (!email || !email.includes('@')) return NextResponse.json({ message: 'A valid email is required.' }, { status: 400 })
    updates.email = email
  }

  if (typeof input.employeeId === 'string') {
    const employeeId = input.employeeId.trim()
    if (!employeeId) return NextResponse.json({ message: 'Employee ID cannot be empty.' }, { status: 400 })
    updates.employeeId = employeeId
  }

  if (typeof input.department === 'string') {
    const department = input.department.trim()
    if (!department) return NextResponse.json({ message: 'Department cannot be empty.' }, { status: 400 })
    updates.department = department
  }

  if (typeof input.active === 'boolean') {
    updates.active = input.active
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: 'No valid staff fields were provided.' }, { status: 400 })
  }

  try {
    const before = await getStaffById(id)
    const staff = await updateStaffAccount(id, updates)

    await logAdminAction({
      actorEmail: user.email,
      action: 'STAFF_UPDATE',
      targetId: id,
      details: `Admin updated employee: ${staff.name} (${staff.email}).`,
      changes: before
        ? Object.fromEntries(
            Object.entries(updates).map(([field, value]) => [field, { from: before[field as keyof typeof before], to: value }])
          )
        : undefined,
    })

    return NextResponse.json({ staff: toPublicStaff(staff) })
  } catch (error) {
    console.error(`Failed to update staff ${id}:`, error)
    return NextResponse.json({ message: 'Failed to update employee.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireAdmin()

  if (!user) {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ message: 'Employee ID is required.' }, { status: 400 })
  }

  try {
    const staff = await getStaffById(id)

    if (!staff) {
      return NextResponse.json({ message: 'Employee was not found.' }, { status: 404 })
    }

    await deleteStaffAccount(id)
    await logAdminAction({
      actorEmail: user.email,
      action: 'STAFF_DELETE',
      targetId: id,
      details: `Admin deleted employee: ${staff.name} (${staff.email}).`,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(`Failed to delete staff ${id}:`, error)
    return NextResponse.json({ message: 'Failed to delete employee.' }, { status: 500 })
  }
}
