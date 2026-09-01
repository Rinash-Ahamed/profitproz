import crypto from 'crypto'
import 'server-only'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const TOTP_PERIOD_SECONDS = 30
const TOTP_DIGITS = 6
const MFA_TOKEN_MAX_AGE_SECONDS = 5 * 60

export const MFA_LOGIN_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-profitpro_mfa_login' : 'profitpro_mfa_login'

type MfaTokenPayload = {
  purpose: 'admin-mfa-login' | 'admin-mfa-setup'
  email: string
  sessionVersion: number
  exp: number
  secret?: string
}

function authSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is required in production.')
  return secret || 'profitpro-local-dev-secret'
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function encodeBase32(bytes: Buffer) {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

function decodeBase32(input: string) {
  const normalized = input.toUpperCase().replace(/=+$/g, '').replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character)
    if (index < 0) throw new Error('INVALID_MFA_SECRET')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

function totpAt(secret: string, counter: number) {
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64BE(BigInt(counter))
  const digest = crypto.createHmac('sha1', decodeBase32(secret)).update(counterBuffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff)
  return String(binary % (10 ** TOTP_DIGITS)).padStart(TOTP_DIGITS, '0')
}

export function generateMfaSecret() {
  return encodeBase32(crypto.randomBytes(20))
}

export function createOtpAuthUri(email: string, secret: string) {
  const issuer = 'ProfitPro'
  const label = `${issuer}:${email.trim().toLowerCase()}`
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`
}

export function verifyTotp(secret: string, candidate: string, now = Date.now()) {
  const code = candidate.replace(/\s/g, '')
  if (!/^\d{6}$/.test(code)) return false
  const counter = Math.floor(now / 1000 / TOTP_PERIOD_SECONDS)
  return [-1, 0, 1].some((offset) => safeEqual(totpAt(secret, counter + offset), code))
}

function encryptionKey() {
  return crypto.createHash('sha256').update(`profitpro:mfa:secret:${authSecret()}`).digest()
}

export function encryptMfaSecret(secret: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.')
}

export function decryptMfaSecret(encrypted: string) {
  const [version, iv, tag, ciphertext] = encrypted.split('.')
  if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('INVALID_MFA_SECRET')
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8')
}

function signPayload(payload: string) {
  return crypto.createHmac('sha256', authSecret()).update(`profitpro:mfa:token:${payload}`).digest('base64url')
}

function createMfaToken(payload: Omit<MfaTokenPayload, 'exp'>, maxAge = MFA_TOKEN_MAX_AGE_SECONDS) {
  const encoded = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + maxAge })).toString('base64url')
  return `${encoded}.${signPayload(encoded)}`
}

function verifyMfaToken(token: string | undefined, purpose: MfaTokenPayload['purpose']) {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature || !safeEqual(signature, signPayload(payload))) return null
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as MfaTokenPayload
    if (decoded.purpose !== purpose || typeof decoded.email !== 'string' || !Number.isInteger(decoded.sessionVersion) || typeof decoded.exp !== 'number' || decoded.exp < Math.floor(Date.now() / 1000)) return null
    return decoded
  } catch {
    return null
  }
}

export function createMfaLoginToken(email: string, sessionVersion: number) {
  return createMfaToken({ purpose: 'admin-mfa-login', email: email.trim().toLowerCase(), sessionVersion })
}

export function verifyMfaLoginToken(token?: string) {
  return verifyMfaToken(token, 'admin-mfa-login')
}

export function createMfaSetupToken(email: string, sessionVersion: number, secret: string) {
  return createMfaToken({ purpose: 'admin-mfa-setup', email: email.trim().toLowerCase(), sessionVersion, secret }, 10 * 60)
}

export function verifyMfaSetupToken(token?: string) {
  const payload = verifyMfaToken(token, 'admin-mfa-setup')
  return payload?.secret ? payload : null
}

export function generateRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const value = crypto.randomBytes(6).toString('hex').toUpperCase()
    return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}`
  })
}

export function normalizeRecoveryCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function hashRecoveryCode(code: string) {
  return crypto.createHmac('sha256', authSecret()).update(`profitpro:mfa:recovery:${normalizeRecoveryCode(code)}`).digest('hex')
}

export function looksLikeRecoveryCode(code: string) {
  return /^[A-F0-9]{12}$/.test(normalizeRecoveryCode(code))
}
