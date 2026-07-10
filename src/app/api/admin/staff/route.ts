import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, hashPassword, verifySessionToken } from '@/lib/auth'
import { createStaffAccount, isFirestoreConfigured } from '@/lib/firestore'

const INITIAL_STAFF_PASSWORD = 'Welcome@123'

function formatStaffName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function emailFromName(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}@profitproz.com`
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  if (!isFirestoreConfigured()) {
    return NextResponse.json({ message: 'Firebase Firestore is not configured.' }, { status: 503 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid staff request.' }, { status: 400 })
  }

  const { name, email } = body as { name?: unknown; email?: unknown }

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ message: 'Staff name is required.' }, { status: 400 })
  }

  const formattedName = formatStaffName(name)
  const staffEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : emailFromName(formattedName)
  let staff

  try {
    staff = await createStaffAccount({
      name: formattedName,
      email: staffEmail,
      passwordHash: hashPassword(INITIAL_STAFF_PASSWORD),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'STAFF_EXISTS') {
      return NextResponse.json(
        { message: 'Email already exists. Choose a different staff name or email.' },
        { status: 409 }
      )
    }

    throw error
  }

  return NextResponse.json({
    staff: {
      name: staff.name,
      email: staff.email,
      mustChangePassword: staff.mustChangePassword,
    },
    initialPassword: INITIAL_STAFF_PASSWORD,
  })
}
