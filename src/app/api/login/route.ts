import { NextResponse } from 'next/server'
import { authConfig, authenticateUser, createSessionToken, getConfiguredUsers, getRoleRedirect } from '@/lib/auth'
import { getSecuritySettings, isFirestoreConfigured } from '@/lib/firestore'

const loginAttempts = new Map<string, { count: number; resetAt: number }>()

export async function POST(request: Request) {
  const clientKey = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const attempt = loginAttempts.get(clientKey)
  if (attempt && attempt.resetAt > Date.now() && attempt.count >= 8) return NextResponse.json({ message: 'Too many login attempts. Please try again later.' }, { status: 429 })
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
    loginAttempts.set(clientKey, { count: (attempt?.resetAt && attempt.resetAt > Date.now() ? attempt.count : 0) + 1, resetAt: Date.now() + 15 * 60 * 1000 })
    return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 })
  }

  loginAttempts.delete(clientKey)
  const security = await getSecuritySettings()
  const maxAge = security.sessionHours * 60 * 60

  const response = NextResponse.json({
    role: user.role,
    mustChangePassword: user.mustChangePassword || false,
    redirectTo: getRoleRedirect(user),
  })

  response.cookies.set(authConfig.cookieName, createSessionToken(user, maxAge), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
    path: '/',
  })

  return response
}
