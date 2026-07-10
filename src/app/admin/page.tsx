import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { getAppVersion } from '@/lib/version'
import { PortalHome } from '../portal-home'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

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
      description="Admin access is active. Role-specific content can be added here next."
    />
  )
}
