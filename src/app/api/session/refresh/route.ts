import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, createSessionToken, verifyActiveSessionToken } from '@/lib/auth'
import { getSecuritySettings } from '@/lib/firestore'

export async function POST() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(
    cookieStore.get(authConfig.cookieName)?.value,
    { allowMustChangePassword: true },
  )
  if (!user) return NextResponse.json({ message: 'Authentication is required.' }, { status: 401 })

  const security = await getSecuritySettings()
  const maxAge = security.sessionHours * 60 * 60
  const expiresAt = Date.now() + maxAge * 1000
  const response = NextResponse.json({ expiresAt, idleTimeoutMs: maxAge * 1000 })
  response.cookies.set(
    authConfig.cookieName,
    createSessionToken(user, maxAge),
    {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge,
      path: '/',
      priority: 'high',
    },
  )
  return response
}
