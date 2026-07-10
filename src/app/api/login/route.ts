import { NextResponse } from 'next/server'
import { authConfig, authenticateUser, createSessionToken, getConfiguredUsers, getRoleRedirect } from '@/lib/auth'
import { isFirestoreConfigured } from '@/lib/firestore'

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid login request.' }, { status: 400 })
  }

  const { email, password } = body as { email?: unknown; password?: unknown }

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 })
  }

  if (getConfiguredUsers().length === 0 && !isFirestoreConfigured()) {
    return NextResponse.json(
      { message: 'Login is not configured yet. Add Admin credentials and Firebase settings to the environment.' },
      { status: 503 }
    )
  }

  let user

  try {
    user = await authenticateUser(email, password)
  } catch (error) {
    console.error('Login failed unexpectedly:', error)
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 })
  }

  const response = NextResponse.json({
    role: user.role,
    mustChangePassword: user.mustChangePassword || false,
    redirectTo: getRoleRedirect(user),
  })

  response.cookies.set(authConfig.cookieName, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: authConfig.maxAge,
    path: '/',
  })

  return response
}
