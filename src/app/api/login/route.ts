import { NextResponse } from 'next/server'
import { authConfig, authenticateUser, createSessionToken, getAuthConfigurationError, getConfiguredUsers, getRoleRedirect } from '@/lib/auth'
import { getSecuritySettings, isFirestoreConfigured } from '@/lib/firestore'

const loginAttempts = new Map<string, { count: number; resetAt: number }>()

export async function POST(request: Request) {
  const clientKey = (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for'))?.split(',')[0]?.trim() || 'local'
  const attempt = loginAttempts.get(clientKey)
  if (attempt && attempt.resetAt > Date.now() && attempt.count >= 8) return NextResponse.json({ message: 'Too many login attempts. Please try again later.' }, { status: 429 })
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid login request.' }, { status: 400 })
  }

  const { email, password } = body as { email?: unknown; password?: unknown }

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password || email.length > 254 || password.length > 1024) {
    return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 })
  }

  const authConfigurationError = getAuthConfigurationError()
  if (authConfigurationError) {
    console.error(authConfigurationError)
    return NextResponse.json({ message: authConfigurationError }, { status: 503 })
  }

  if (getConfiguredUsers().length === 0 && !isFirestoreConfigured()) {
    return NextResponse.json(
      { message: 'Login is not configured yet. Add Admin credentials and Firebase settings to the environment.' },
      { status: 503 }
    )
  }

  try {
    const user = await authenticateUser(email, password)

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
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge,
      path: '/',
      priority: 'high',
    })

    return response
  } catch (error) {
    console.error('Login failed unexpectedly:', error)
    return NextResponse.json({ message: 'The server could not complete login.' }, { status: 500 })
  }
}
