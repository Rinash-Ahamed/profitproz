import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { getAppVersion } from '@/lib/version'
import { PortalHome } from '../portal-home'

export default async function StaffPage() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'staff', allowMustChangePassword: true })

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'staff') {
    redirect('/admin')
  }

  return (
    <PortalHome
      user={user}
      version={getAppVersion()}
      title="Employee Workspace"
    />
  )
}
