import { cookies } from 'next/headers'
import 'server-only'
import { authConfig, verifyActiveSessionToken } from './auth'

export async function requireAdminSession() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  return user?.role === 'admin' ? user : null
}

export async function requireStaffSession(options: { allowMustChangePassword?: boolean } = {}) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, {
    role: 'staff',
    allowMustChangePassword: options.allowMustChangePassword,
  })
  return user?.role === 'staff' ? user : null
}

export async function requireClientServiceEditor(service: 'revenueManagement' | 'otaOnboarding') {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value)
  if (!user) return null
  if (user.role === 'admin') return user
  return user.clientAccess?.[service] ? user : null
}
