import crypto from 'crypto'
import { getStaffByEmail } from './firestore'

export type UserRole = 'admin' | 'staff'

export type SessionUser = {
  email: string
  role: UserRole
  mustChangePassword?: boolean
}

type LoginUser = SessionUser & {
  password: string
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
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'profitpro-local-dev-secret'
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

  if (process.env.ADMIN_LOGIN_EMAIL && process.env.ADMIN_LOGIN_PASSWORD) {
    users.push({
      email: process.env.ADMIN_LOGIN_EMAIL,
      password: process.env.ADMIN_LOGIN_PASSWORD,
      role: 'admin',
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

export async function authenticateUser(email: string, password: string): Promise<SessionUser | null> {
  const normalizedEmail = email.trim().toLowerCase()

  for (const user of getConfiguredUsers()) {
    const emailMatches = user.email.trim().toLowerCase() === normalizedEmail
    const passwordMatches = safeEqual(password, user.password)

    if (emailMatches && passwordMatches) {
      return {
        email: user.email,
        role: user.role,
      }
    }
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

export function createSessionToken(user: SessionUser) {
  const payload = Buffer.from(
    JSON.stringify({
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword || false,
      exp: Math.floor(Date.now() / 1000) + authConfig.maxAge,
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
