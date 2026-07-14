import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { getAppVersion } from '@/lib/version'
import { PortalHome } from '../portal-home'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'admin') {
    redirect('/staff')
  }

  return (
    <PortalHome
      user={user}
      version={getAppVersion()}
      title="Admin Workspace"
    />
  )
}
