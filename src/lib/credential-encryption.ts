import crypto from 'crypto'
import 'server-only'

const VERSION = 'v1'

function encryptionKey() {
  const secret = process.env.CLIENT_CREDENTIALS_ENCRYPTION_KEY?.trim()
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('CLIENT_CREDENTIALS_ENCRYPTION_KEY_NOT_CONFIGURED')
  }
  return crypto.createHash('sha256').update(`profitpro-client-credentials:${secret}`).digest()
}

export function encryptCredentialPayload(value: unknown) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.')
}

export function decryptCredentialPayload<T>(payload: string): T {
  const [version, ivValue, tagValue, encryptedValue] = payload.split('.')
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) throw new Error('INVALID_CREDENTIAL_PAYLOAD')
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8')) as T
}
