import crypto from 'crypto'
import { getAdminByEmail, getStaffByEmail, isFirestoreConfigured, type SecuritySettings } from './firestore'
import 'server-only'

export type UserRole = 'admin' | 'staff'

export type SessionUser = {
  email: string
  role: UserRole
  mustChangePassword?: boolean
  sessionVersion: number
  expiresAt?: number
}

type LoginUser = SessionUser & {
  password: string
}

const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-profitpro_session' : 'profitpro_session'
const ONE_DAY_SECONDS = 60 * 60 * 24
const PASSWORD_ITERATIONS = 600000
const MIN_SUPPORTED_PASSWORD_ITERATIONS = 120000
const PASSWORD_KEY_LENGTH = 32

export const authConfig = {
  cookieName: SESSION_COOKIE,
  maxAge: ONE_DAY_SECONDS,
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is required in production.')
  if (secret && process.env.NODE_ENV === 'production' && Buffer.byteLength(secret) < 32) throw new Error('AUTH_SECRET must contain at least 32 bytes.')
  return secret || 'profitpro-local-dev-secret'
}

export function getAuthConfigurationError() {
  if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    return 'Server authentication is not configured. Add AUTH_SECRET to the deployment environment and redeploy.'
  }

  if (process.env.NODE_ENV === 'production' && !isFirestoreConfigured()) {
    return 'Server authentication storage is not configured.'
  }

  return null
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)

  if (left.length !== right.length) {
    return false
  }

  return crypto.timingSafeEqual(left, right)
}

export function getConfiguredUsers(): LoginUser[] {
  if (process.env.NODE_ENV === 'production') return []

  const users: LoginUser[] = []

  const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_LOGIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_LOGIN_PASSWORD

  if (adminEmail && adminPassword) {
    users.push({
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      sessionVersion: 0,
    })
  }

  if (process.env.STAFF_LOGIN_EMAIL && process.env.STAFF_LOGIN_PASSWORD) {
    users.push({
      email: process.env.STAFF_LOGIN_EMAIL,
      password: process.env.STAFF_LOGIN_PASSWORD,
      role: 'staff',
      sessionVersion: 0,
    })
  }

  return users
}

function derivePasswordKey(password: string, salt: string, iterations: number) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, PASSWORD_KEY_LENGTH, 'sha256', (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

export async function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = (await derivePasswordKey(password, salt, PASSWORD_ITERATIONS)).toString('hex')
  return `${PASSWORD_ITERATIONS}:${salt}:${hash}`
}

export async function verifyPassword(password: string, storedPassword: string) {
  const [iterations, salt, storedHash] = storedPassword.split(':')
  const iterationCount = Number(iterations)

  if (
    !Number.isInteger(iterationCount) ||
    iterationCount < MIN_SUPPORTED_PASSWORD_ITERATIONS ||
    iterationCount > 1_000_000 ||
    !/^[a-f0-9]{32}$/i.test(salt || '') ||
    !/^[a-f0-9]{64}$/i.test(storedHash || '')
  ) {
    return false
  }

  const hash = await derivePasswordKey(password, salt, iterationCount)

  return safeEqual(hash.toString('hex'), storedHash)
}

export function getPasswordValidationMessage(password: string, settings: SecuritySettings) {
  if (password.length < settings.minPasswordLength) {
    return `New password must be at least ${settings.minPasswordLength} characters.`
  }

  if (settings.requireUppercase && !/[A-Z]/.test(password)) {
    return 'New password must include an uppercase letter.'
  }

  if (settings.requireNumber && !/\d/.test(password)) {
    return 'New password must include a number.'
  }

  return null
}

export async function authenticateUser(email: string, password: string): Promise<SessionUser | null> {
  const normalizedEmail = email.trim().toLowerCase()

  if (isFirestoreConfigured()) {
    // Both collections are independent. Reading them together removes an entire
    // network round trip for staff logins while preserving admin precedence.
    const [admin, staff] = await Promise.all([
      getAdminByEmail(normalizedEmail),
      getStaffByEmail(normalizedEmail),
    ])

    if (admin?.active && await verifyPassword(password, admin.passwordHash)) {
      return {
        email: admin.email,
        role: 'admin',
        sessionVersion: admin.sessionVersion,
      }
    }

    if (staff?.active && await verifyPassword(password, staff.passwordHash)) {
      return {
        email: staff.email,
        role: 'staff',
        mustChangePassword: staff.mustChangePassword,
        sessionVersion: staff.sessionVersion,
      }
    }

    return null
  }

  for (const user of isFirestoreConfigured() ? [] : getConfiguredUsers()) {
    const emailMatches = user.email.trim().toLowerCase() === normalizedEmail
    const passwordMatches = safeEqual(password, user.password)

    if (emailMatches && passwordMatches) {
      return {
        email: normalizedEmail,
        role: user.role,
        sessionVersion: user.sessionVersion,
      }
    }
  }

  return null
}

export function createSessionToken(user: SessionUser, maxAge = authConfig.maxAge) {
  const payload = Buffer.from(
    JSON.stringify({
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword || false,
      sessionVersion: user.sessionVersion,
      exp: Math.floor(Date.now() / 1000) + maxAge,
    })
  ).toString('base64url')

  const signature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(payload)
    .digest('base64url')

  return `${payload}.${signature}`
}

export function verifySessionToken(token?: string): SessionUser | null {
  if (!token) {
    return null
  }

  const [payload, signature] = token.split('.')

  if (!payload || !signature) {
    return null
  }

  const expectedSignature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(payload)
    .digest('base64url')

  if (!safeEqual(signature, expectedSignature)) {
    return null
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))

    if (
      typeof decoded.email !== 'string' ||
      (decoded.role !== 'admin' && decoded.role !== 'staff') ||
      typeof decoded.mustChangePassword !== 'boolean' ||
      !Number.isInteger(decoded.sessionVersion) ||
      typeof decoded.exp !== 'number' ||
      decoded.exp < Math.floor(Date.now() / 1000)
    ) {
      return null
    }

    return {
      email: decoded.email,
      role: decoded.role,
      mustChangePassword: decoded.mustChangePassword,
      sessionVersion: decoded.sessionVersion,
      expiresAt: decoded.exp * 1000,
    }
  } catch {
    return null
  }
}

export async function verifyActiveSessionToken(
  token: string | undefined,
  options: { role?: UserRole; allowMustChangePassword?: boolean } = {},
): Promise<SessionUser | null> {
  const session = verifySessionToken(token)
  if (!session || (options.role && session.role !== options.role)) return null

  if (!isFirestoreConfigured()) {
    return process.env.NODE_ENV === 'production' ? null : session
  }

  if (session.role === 'admin') {
    const admin = await getAdminByEmail(session.email)
    if (!admin?.active || admin.sessionVersion !== session.sessionVersion) return null
    return { email: admin.email, role: 'admin', mustChangePassword: false, sessionVersion: admin.sessionVersion, expiresAt: session.expiresAt }
  }

  const staff = await getStaffByEmail(session.email)
  if (!staff?.active || staff.sessionVersion !== session.sessionVersion) return null
  if (staff.mustChangePassword && !options.allowMustChangePassword) return null

  return {
    email: staff.email,
    role: 'staff',
    mustChangePassword: staff.mustChangePassword,
    sessionVersion: staff.sessionVersion,
    expiresAt: session.expiresAt,
  }
}

export function getRoleRedirect(user: SessionUser) {
  return user.role === 'admin' ? '/admin' : '/staff'
}
