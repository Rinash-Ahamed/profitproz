import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { authConfig, hashPassword, verifyActiveSessionToken } from '@/lib/auth'
import { createStaffAccount, listStaffAccounts, logAdminAction, saveSalary, toPublicStaff } from '@/lib/firestore'

function createTemporaryPassword() {
  return crypto.randomBytes(24).toString('base64url')
}

async function requireAdmin() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })

  return user?.role === 'admin' ? user : null
}

export async function GET() {
  const user = await requireAdmin()

  if (!user) {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const staff = await listStaffAccounts()
  staff.sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ staff: staff.map(toPublicStaff) })
}

export async function POST(request: Request) {
  const user = await requireAdmin()

  if (!user) {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid employee request.' }, { status: 400 })
  }

  const { firstName, lastName, employeeId, department, role, annualCtc } = body as {
    firstName?: unknown
    lastName?: unknown
    employeeId?: unknown
    department?: unknown
    role?: unknown
    annualCtc?: unknown
  }
  const first = typeof firstName === 'string' ? firstName.trim() : ''
  const last = typeof lastName === 'string' ? lastName.trim() : ''
  const staffName = `${first} ${last}`.trim()
  const staffEmployeeId = typeof employeeId === 'string' ? employeeId.trim() : ''
  const staffDepartment = typeof department === 'string' ? department.trim() : ''
  const staffRole = typeof role === 'string' ? role.trim() : ''
  const ctc = Number(annualCtc)

  if (!first || first.length > 80 || !last || last.length > 80 || !staffEmployeeId || staffEmployeeId.length > 50 || !staffDepartment || staffDepartment.length > 100 || !staffRole || staffRole.length > 100) {
    return NextResponse.json({ message: 'First name, last name, employee ID, department, and role are required.' }, { status: 400 })
  }

  if (!Number.isFinite(ctc) || ctc <= 0 || ctc > 1_000_000_000) {
    return NextResponse.json({ message: 'Annual CTC must be a valid positive number.' }, { status: 400 })
  }

  try {
    const temporaryPassword = createTemporaryPassword()
    const staff = await createStaffAccount({
      name: staffName,
      email: `${first.toLowerCase().replace(/\s+/g, '')}@profitproz.com`,
      employeeId: staffEmployeeId,
      department: staffDepartment,
      role: staffRole,
      annualCtc: ctc,
      passwordHash: await hashPassword(temporaryPassword),
    })

    await saveSalary(staff.id, {
      staffEmail: staff.email,
      baseSalary: ctc / 12,
      notes: 'Monthly salary calculated from annual CTC.',
    })

    await logAdminAction({
      actorEmail: user.email,
      action: 'STAFF_CREATE',
      targetId: staff.id,
      details: `Admin created employee: ${staff.name} (${staff.email}).`,
    })

    return NextResponse.json({ staff: toPublicStaff(staff), initialPassword: temporaryPassword }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'STAFF_EXISTS') {
      return NextResponse.json({ message: 'An employee with this generated email already exists.' }, { status: 409 })
    }

    console.error('Failed to create staff account:', error)
    return NextResponse.json({ message: 'Failed to create employee account.' }, { status: 500 })
  }
}
