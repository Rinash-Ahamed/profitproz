import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, hashPassword, verifySessionToken } from '@/lib/auth'
import {
  createStaffAccount,
  isFirestoreConfigured,
  listStaffAccounts,
  saveSalary,
} from '@/lib/firestore'

const INITIAL_STAFF_PASSWORD = 'Welcome@123'

export async function GET() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const staff = await listStaffAccounts()
  return NextResponse.json({ staff })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  let body: {
    name?: string
    baseSalary?: number
    employeeId?: string
    department?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid staff request.' }, { status: 400 })
  }

  const { name, baseSalary, employeeId, department } = body

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ message: 'Staff name is required.' }, { status: 400 })
  }

  if (baseSalary !== undefined && (typeof baseSalary !== 'number' || baseSalary < 0)) {
    return NextResponse.json({ message: 'If provided, base salary must be a valid number.' }, { status: 400 })
  }

  if (typeof employeeId !== 'string' || !employeeId.trim()) {
    return NextResponse.json({ message: 'Employee ID is required.' }, { status: 400 })
  }

  if (typeof department !== 'string' || !department.trim()) {
    return NextResponse.json({ message: 'Department is required.' }, { status: 400 })
  }

  if (process.env.LOCAL_TESTING === 'true' || !isFirestoreConfigured()) {
    const reason = process.env.LOCAL_TESTING === 'true' ? 'LOCAL_TESTING flag is set' : 'Firestore not configured'
    console.log(`Mocking staff creation response for local testing. Reason: ${reason}.`)
    const mockName = name.trim().replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
    const mockEmail = `${name.trim().toLowerCase().replace(/\s+/g, '')}@profitproz.com`

    return NextResponse.json({
      staff: {
        id: `mock_${Date.now()}`,
        name: mockName,
        email: mockEmail,
        employeeId: employeeId,
        department: department,
        active: true,
        mustChangePassword: true,
        passwordHash: '',
      },
      initialPassword: INITIAL_STAFF_PASSWORD,
    })
  }

  let staff
  try {
    staff = await createStaffAccount({
      name: name,
      passwordHash: hashPassword(INITIAL_STAFF_PASSWORD),
      employeeId: employeeId,
      department: department,
    })

    if (staff && typeof baseSalary === 'number' && baseSalary > 0) {
      await saveSalary({
        staffEmail: staff.email,
        baseSalary: baseSalary,
        notes: 'Initial salary set during account creation.',
      })
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'STAFF_EXISTS') {
      return NextResponse.json(
        { message: 'An account with this email already exists. Please choose a different name to generate a unique email.' },
        { status: 409 }
      )
    }
    console.error('Failed to create staff:', error)
    return NextResponse.json({ message: 'Failed to create staff member.' }, { status: 500 })
  }

  return NextResponse.json({
    staff,
    initialPassword: INITIAL_STAFF_PASSWORD,
  })
}