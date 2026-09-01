import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, createSessionToken } from '@/lib/auth'
import { consumeAdminMfaRecoveryCode, getAdminByEmail, getSecuritySettings, logAdminAction } from '@/lib/firestore'
import { decryptMfaSecret, hashRecoveryCode, looksLikeRecoveryCode, MFA_LOGIN_COOKIE, verifyMfaLoginToken, verifyTotp } from '@/lib/mfa'

const attempts = new Map<string, { count: number; resetAt: number }>()

function clearPendingCookie(response: NextResponse) {
  response.cookies.set(MFA_LOGIN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
    priority: 'high',
  })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const pendingToken = cookieStore.get(MFA_LOGIN_COOKIE)?.value
  const pending = verifyMfaLoginToken(pendingToken)
  if (!pending) return NextResponse.json({ message: 'Your verification session expired. Sign in again.' }, { status: 401 })

  const attemptKey = pending.email.trim().toLowerCase()
  const attempt = attempts.get(attemptKey)
  if (attempt && attempt.resetAt > Date.now() && attempt.count >= 8) {
    const response = NextResponse.json({ message: 'Too many incorrect codes. Sign in again.' }, { status: 429 })
    clearPendingCookie(response)
    return response
  }

  let body: { code?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid verification request.' }, { status: 400 }) }
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  if (!code || code.length > 32) return NextResponse.json({ message: 'Enter your six-digit code or a recovery code.' }, { status: 400 })

  const admin = await getAdminByEmail(pending.email)
  if (!admin?.active || !admin.mfaEnabled || !admin.mfaSecretEncrypted || admin.sessionVersion !== pending.sessionVersion) {
    const response = NextResponse.json({ message: 'This verification session is no longer valid.' }, { status: 401 })
    clearPendingCookie(response)
    return response
  }

  let verified = false
  let usedRecoveryCode = false
  try {
    if (looksLikeRecoveryCode(code)) {
      verified = await consumeAdminMfaRecoveryCode(admin.id, hashRecoveryCode(code))
      usedRecoveryCode = verified
    } else {
      verified = verifyTotp(decryptMfaSecret(admin.mfaSecretEncrypted), code)
    }
  } catch {
    verified = false
  }

  if (!verified) {
    attempts.set(attemptKey, {
      count: attempt && attempt.resetAt > Date.now() ? attempt.count + 1 : 1,
      resetAt: attempt && attempt.resetAt > Date.now() ? attempt.resetAt : Date.now() + 15 * 60 * 1000,
    })
    return NextResponse.json({ message: 'The verification code is incorrect or expired.' }, { status: 401 })
  }

  attempts.delete(attemptKey)
  const security = await getSecuritySettings()
  const maxAge = security.sessionHours * 60 * 60
  const response = NextResponse.json({ redirectTo: '/admin' })
  response.cookies.set(authConfig.cookieName, createSessionToken({
    email: admin.email,
    role: 'admin',
    sessionVersion: admin.sessionVersion,
  }, maxAge), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
    path: '/',
    priority: 'high',
  })
  clearPendingCookie(response)
  if (usedRecoveryCode) {
    try {
      await logAdminAction({ actorEmail: admin.email, action: 'ADMIN_MFA_RECOVERY_LOGIN', targetId: admin.id, details: 'Admin signed in with a one-time MFA recovery code.' })
    } catch (error) {
      console.error('Failed to audit Admin MFA recovery login:', error)
    }
  }
  return response
}
