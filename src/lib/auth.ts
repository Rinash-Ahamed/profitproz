import crypto from 'crypto'
import { createAdminAccount, getAdminByEmail, getStaffByEmail, isFirestoreConfigured, type SecuritySettings } from './firestore'

export type UserRole = 'admin' | 'staff'

export type SessionUser = {
  email: string
  role: UserRole
  mustChangePassword?: boolean
}

type LoginUser = SessionUser & {
  password: string
  shouldSeedFirestore?: boolean
}

const SESSION_COOKIE = 'profitpro_session'
const ONE_DAY_SECONDS = 60 * 60 * 24
const PASSWORD_ITERATIONS = 120000
const PASSWORD_KEY_LENGTH = 32

export const authConfig = {
  cookieName: SESSION_COOKIE,
  maxAge: ONE_DAY_SECONDS,
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is required in production.')
  return secret || 'profitpro-local-dev-secret'
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
  const users: LoginUser[] = []

  const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_LOGIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_LOGIN_PASSWORD

  if (adminEmail && adminPassword) {
    users.push({
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      shouldSeedFirestore: true,
    })
  }

  if (process.env.STAFF_LOGIN_EMAIL && process.env.STAFF_LOGIN_PASSWORD) {
    users.push({
      email: process.env.STAFF_LOGIN_EMAIL,
      password: process.env.STAFF_LOGIN_PASSWORD,
      role: 'staff',
    })
  }

  return users
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, 'sha256').toString('hex')
  return `${PASSWORD_ITERATIONS}:${salt}:${hash}`
}

export function verifyPassword(password: string, storedPassword: string) {
  const [iterations, salt, storedHash] = storedPassword.split(':')

  if (!iterations || !salt || !storedHash) {
    return safeEqual(password, storedPassword)
  }

  const hash = crypto
    .pbkdf2Sync(password, salt, Number(iterations), PASSWORD_KEY_LENGTH, 'sha256')
    .toString('hex')

  return safeEqual(hash, storedHash)
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
    const admin = await getAdminByEmail(normalizedEmail)

    if (admin?.active && verifyPassword(password, admin.passwordHash)) {
      return {
        email: admin.email,
        role: 'admin',
      }
    }
  }

  for (const user of getConfiguredUsers()) {
    const emailMatches = user.email.trim().toLowerCase() === normalizedEmail
    const passwordMatches = safeEqual(password, user.password)

    if (emailMatches && passwordMatches) {
      if (user.role === 'admin' && user.shouldSeedFirestore && isFirestoreConfigured()) {
        try {
          await createAdminAccount({
            email: normalizedEmail,
            passwordHash: hashPassword(password),
          })
        } catch (error) {
          if (!(error instanceof Error) || error.message !== 'ADMIN_EXISTS') {
            console.error('Failed to seed Firestore admin account:', error)
          }
        }
      }

      return {
        email: normalizedEmail,
        role: user.role,
      }
    }
  }

  if (!isFirestoreConfigured()) {
    return null
  }

  const staff = await getStaffByEmail(normalizedEmail)

  if (staff?.active && verifyPassword(password, staff.passwordHash)) {
    return {
      email: staff.email,
      role: 'staff',
      mustChangePassword: staff.mustChangePassword,
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
      typeof decoded.exp !== 'number' ||
      decoded.exp < Math.floor(Date.now() / 1000)
    ) {
      return null
    }

    return {
      email: decoded.email,
      role: decoded.role,
      mustChangePassword: decoded.mustChangePassword,
    }
  } catch {
    return null
  }
}

export function getRoleRedirect(user: SessionUser) {
  return user.role === 'admin' ? '/admin' : '/staff'
}
