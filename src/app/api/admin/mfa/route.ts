import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { authConfig, createSessionToken, verifyPassword } from '@/lib/auth'
import { disableAdminMfa, enableAdminMfa, getAdminByEmail, getSecuritySettings, logAdminAction } from '@/lib/firestore'
import { createMfaSetupToken, createOtpAuthUri, decryptMfaSecret, encryptMfaSecret, generateMfaSecret, generateRecoveryCodes, hashRecoveryCode, looksLikeRecoveryCode, verifyMfaSetupToken, verifyTotp } from '@/lib/mfa'
import { requireAdminSession } from '@/lib/api-auth'

function setFreshAdminSession(response: NextResponse, email: string, sessionVersion: number, maxAge: number) {
  response.cookies.set(authConfig.cookieName, createSessionToken({ email, role: 'admin', sessionVersion }, maxAge), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
    path: '/',
    priority: 'high',
  })
}

export async function GET() {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const admin = await getAdminByEmail(user.email)
  if (!admin) return NextResponse.json({ message: 'Admin account was not found.' }, { status: 404 })
  return NextResponse.json({
    enabled: admin.mfaEnabled,
    enabledAt: admin.mfaEnabledAt || null,
    recoveryCodesRemaining: admin.mfaRecoveryCodeHashes.length,
  })
}

export async function POST(request: Request) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  let body: { currentPassword?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid MFA setup request.' }, { status: 400 }) }
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  if (!currentPassword || currentPassword.length > 1024) return NextResponse.json({ message: 'Enter your current Admin password.' }, { status: 400 })
  const admin = await getAdminByEmail(user.email)
  if (!admin || !await verifyPassword(currentPassword, admin.passwordHash)) return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 401 })
  if (admin.mfaEnabled) return NextResponse.json({ message: 'MFA is already enabled for this Admin.' }, { status: 409 })

  const secret = generateMfaSecret()
  const otpAuthUri = createOtpAuthUri(admin.email, secret)
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUri, { width: 240, margin: 1, errorCorrectionLevel: 'M' })
  return NextResponse.json({
    secret,
    qrCodeDataUrl,
    setupToken: createMfaSetupToken(admin.email, admin.sessionVersion, secret),
  })
}

export async function PUT(request: Request) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  let body: { setupToken?: unknown; code?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid MFA verification request.' }, { status: 400 }) }
  const setupToken = typeof body.setupToken === 'string' ? body.setupToken : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  const setup = verifyMfaSetupToken(setupToken)
  const admin = await getAdminByEmail(user.email)
  if (!admin || !setup || setup.email !== admin.email || setup.sessionVersion !== admin.sessionVersion) return NextResponse.json({ message: 'MFA setup expired. Start again.' }, { status: 401 })
  if (admin.mfaEnabled) return NextResponse.json({ message: 'MFA is already enabled for this Admin.' }, { status: 409 })
  if (!verifyTotp(setup.secret!, code)) return NextResponse.json({ message: 'The six-digit code is incorrect or expired.' }, { status: 400 })

  const recoveryCodes = generateRecoveryCodes()
  const updated = await enableAdminMfa(admin.id, encryptMfaSecret(setup.secret!), recoveryCodes.map(hashRecoveryCode))
  try {
    await logAdminAction({ actorEmail: admin.email, action: 'ADMIN_MFA_ENABLE', targetId: admin.id, details: 'Admin enabled authenticator-app MFA.' })
  } catch (error) {
    console.error('Failed to audit Admin MFA enable:', error)
  }
  const security = await getSecuritySettings()
  const maxAge = security.sessionHours * 60 * 60
  const response = NextResponse.json({ enabled: true, recoveryCodes, recoveryCodesRemaining: recoveryCodes.length })
  setFreshAdminSession(response, updated.email, updated.sessionVersion, maxAge)
  return response
}

export async function DELETE(request: Request) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  let body: { currentPassword?: unknown; code?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid MFA removal request.' }, { status: 400 }) }
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  if (!currentPassword || currentPassword.length > 1024 || !code || code.length > 32) return NextResponse.json({ message: 'Enter your current password and verification code.' }, { status: 400 })
  const admin = await getAdminByEmail(user.email)
  if (!admin || !await verifyPassword(currentPassword, admin.passwordHash)) return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 401 })
  if (!admin.mfaEnabled || !admin.mfaSecretEncrypted) return NextResponse.json({ message: 'MFA is not enabled for this Admin.' }, { status: 409 })

  let verified = false
  try {
    verified = looksLikeRecoveryCode(code)
      ? admin.mfaRecoveryCodeHashes.includes(hashRecoveryCode(code))
      : verifyTotp(decryptMfaSecret(admin.mfaSecretEncrypted), code)
  } catch {
    verified = false
  }
  if (!verified) return NextResponse.json({ message: 'The verification code is incorrect or expired.' }, { status: 401 })

  const updated = await disableAdminMfa(admin.id)
  try {
    await logAdminAction({ actorEmail: admin.email, action: 'ADMIN_MFA_DISABLE', targetId: admin.id, details: 'Admin disabled authenticator-app MFA.' })
  } catch (error) {
    console.error('Failed to audit Admin MFA disable:', error)
  }
  const security = await getSecuritySettings()
  const maxAge = security.sessionHours * 60 * 60
  const response = NextResponse.json({ enabled: false, recoveryCodesRemaining: 0 })
  setFreshAdminSession(response, updated.email, updated.sessionVersion, maxAge)
  return response
}
