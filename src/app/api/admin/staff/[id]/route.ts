import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { deleteStaffAccount, getStaffById, logAdminAction, toPublicStaff, updateStaffAccount } from '@/lib/firestore'

type RouteContext = {
  params: Promise<{ id: string }>
}

async function requireAdmin() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })

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
    personalEmail?: unknown
    employeeId?: unknown
    department?: unknown
    role?: unknown
    annualCtc?: unknown
    active?: unknown
  }
  const updates: Parameters<typeof updateStaffAccount>[1] = {}

  if (typeof input.name === 'string') {
    const name = input.name.trim()
    if (!name || name.length > 160) return NextResponse.json({ message: 'Enter a valid employee name.' }, { status: 400 })
    updates.name = name
  }

  if (typeof input.email === 'string') {
    const email = input.email.trim().toLowerCase()
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ message: 'A valid email is required.' }, { status: 400 })
    updates.email = email
  }

  if (typeof input.personalEmail === 'string') {
    const personalEmail = input.personalEmail.trim().toLowerCase()
    if (!personalEmail || personalEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail)) return NextResponse.json({ message: 'A valid personal email is required.' }, { status: 400 })
    updates.personalEmail = personalEmail
  }

  if (typeof input.employeeId === 'string') {
    const employeeId = input.employeeId.trim()
    if (!employeeId || employeeId.length > 50) return NextResponse.json({ message: 'Enter a valid employee ID.' }, { status: 400 })
    updates.employeeId = employeeId
  }

  if (typeof input.department === 'string') {
    const department = input.department.trim()
    if (!department || department.length > 100) return NextResponse.json({ message: 'Enter a valid department.' }, { status: 400 })
    updates.department = department
  }

  if (typeof input.role === 'string') {
    const role = input.role.trim()
    if (!role || role.length > 100) return NextResponse.json({ message: 'Enter a valid employee role.' }, { status: 400 })
    updates.role = role
  }

  if (input.annualCtc !== undefined) {
    const annualCtc = Number(input.annualCtc)
    if (!Number.isFinite(annualCtc) || annualCtc <= 0 || annualCtc > 1_000_000_000) return NextResponse.json({ message: 'Annual CTC must be a valid positive number.' }, { status: 400 })
    updates.annualCtc = annualCtc
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
    if (error instanceof Error && error.message === 'STAFF_NOT_FOUND') return NextResponse.json({ message: 'Employee was not found.' }, { status: 404 })
    if (error instanceof Error && error.message === 'STAFF_EXISTS') return NextResponse.json({ message: 'An employee with this company email already exists.' }, { status: 409 })
    if (error instanceof Error && error.message === 'EMPLOYEE_ID_EXISTS') return NextResponse.json({ message: 'An employee with this employee ID already exists.' }, { status: 409 })
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
