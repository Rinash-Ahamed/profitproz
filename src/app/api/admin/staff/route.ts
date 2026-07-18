import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { hashPassword } from '@/lib/auth'
import { createStaffAccount, listStaffAccounts, listStaffAccountsPage, logAdminAction, toPublicStaff } from '@/lib/firestore'
import { readPagination } from '@/lib/pagination'
import { requireAdminSession as requireAdmin } from '@/lib/api-auth'

function createTemporaryPassword() {
  return crypto.randomBytes(24).toString('base64url')
}

export async function GET(request: Request) {
  const user = await requireAdmin()

  if (!user) {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const pagination = readPagination(request)
  if (pagination) {
    const page = await listStaffAccountsPage(pagination)
    page.items.sort((a, b) => a.name.localeCompare(b.name))
    return NextResponse.json({ staff: page.items.map(toPublicStaff), nextCursor: page.nextCursor })
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

  const { firstName, lastName, personalEmail, employeeId, department, role, annualCtc, clientAccess } = body as {
    firstName?: unknown
    lastName?: unknown
    personalEmail?: unknown
    employeeId?: unknown
    department?: unknown
    role?: unknown
    annualCtc?: unknown
    clientAccess?: unknown
  }
  const first = typeof firstName === 'string' ? firstName.trim() : ''
  const last = typeof lastName === 'string' ? lastName.trim() : ''
  const staffName = `${first} ${last}`.trim()
  const staffPersonalEmail = typeof personalEmail === 'string' ? personalEmail.trim().toLowerCase() : ''
  const staffEmployeeId = typeof employeeId === 'string' ? employeeId.trim() : ''
  const staffDepartment = typeof department === 'string' ? department.trim() : ''
  const staffRole = typeof role === 'string' ? role.trim() : ''
  const ctc = Number(annualCtc)
  const accessInput = clientAccess && typeof clientAccess === 'object' && !Array.isArray(clientAccess) ? clientAccess as Record<string, unknown> : {}
  const staffClientAccess = {
    revenueManagement: accessInput.revenueManagement === true,
    otaOnboarding: accessInput.otaOnboarding === true,
  }

  if (!first || first.length > 80 || !last || last.length > 80 || !staffEmployeeId || staffEmployeeId.length > 50 || !staffDepartment || staffDepartment.length > 100 || !staffRole || staffRole.length > 100) {
    return NextResponse.json({ message: 'First name, last name, employee ID, department, and role are required.' }, { status: 400 })
  }

  if (!staffPersonalEmail || staffPersonalEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffPersonalEmail)) {
    return NextResponse.json({ message: 'A valid personal email is required.' }, { status: 400 })
  }

  if (!Number.isFinite(ctc) || ctc <= 0 || ctc > 1_000_000_000) {
    return NextResponse.json({ message: 'Annual CTC must be a valid positive number.' }, { status: 400 })
  }

  try {
    const temporaryPassword = createTemporaryPassword()
    const staff = await createStaffAccount({
      name: staffName,
      email: `${first.toLowerCase().replace(/\s+/g, '')}@profitproz.com`,
      personalEmail: staffPersonalEmail,
      employeeId: staffEmployeeId,
      department: staffDepartment,
      role: staffRole,
      annualCtc: ctc,
      passwordHash: await hashPassword(temporaryPassword),
      clientAccess: staffClientAccess,
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
    if (error instanceof Error && error.message === 'EMPLOYEE_ID_EXISTS') {
      return NextResponse.json({ message: 'An employee with this employee ID already exists.' }, { status: 409 })
    }

    console.error('Failed to create staff account:', error)
    return NextResponse.json({ message: 'Failed to create employee account.' }, { status: 500 })
  }
}
