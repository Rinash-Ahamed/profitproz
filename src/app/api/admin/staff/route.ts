import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, hashPassword, verifySessionToken } from '@/lib/auth'
import { createStaffAccount, listStaffAccounts, logAdminAction, saveSalary, toPublicStaff } from '@/lib/firestore'

const INITIAL_STAFF_PASSWORD = 'Welcome@123'

async function requireAdmin() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

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
    return NextResponse.json({ message: 'Invalid staff request.' }, { status: 400 })
  }

  const { name, employeeId, department, baseSalary } = body as {
    name?: unknown
    employeeId?: unknown
    department?: unknown
    baseSalary?: unknown
  }
  const staffName = typeof name === 'string' ? name.trim() : ''
  const staffEmployeeId = typeof employeeId === 'string' ? employeeId.trim() : ''
  const staffDepartment = typeof department === 'string' ? department.trim() : ''
  const salary = Number(baseSalary)

  if (!staffName || !staffEmployeeId || !staffDepartment) {
    return NextResponse.json({ message: 'Staff name, employee ID, and department are required.' }, { status: 400 })
  }

  if (baseSalary !== undefined && (!Number.isFinite(salary) || salary < 0)) {
    return NextResponse.json({ message: 'Base salary must be a valid non-negative number.' }, { status: 400 })
  }

  try {
    const staff = await createStaffAccount({
      name: staffName,
      employeeId: staffEmployeeId,
      department: staffDepartment,
      passwordHash: hashPassword(INITIAL_STAFF_PASSWORD),
    })

    if (Number.isFinite(salary) && salary > 0) {
      await saveSalary(staff.id, {
        staffEmail: staff.email,
        baseSalary: salary,
        notes: 'Initial salary from staff creation.',
      })
    }

    await logAdminAction({
      actorEmail: user.email,
      action: 'STAFF_CREATE',
      targetId: staff.id,
      details: `Admin created staff member: ${staff.name} (${staff.email}).`,
    })

    return NextResponse.json({ staff: toPublicStaff(staff), initialPassword: INITIAL_STAFF_PASSWORD }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'STAFF_EXISTS') {
      return NextResponse.json({ message: 'A staff member with this generated email already exists.' }, { status: 409 })
    }

    console.error('Failed to create staff account:', error)
    return NextResponse.json({ message: 'Failed to create staff account.' }, { status: 500 })
  }
}
