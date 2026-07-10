import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { getAppVersion } from '@/lib/version'
import { PortalHome } from '../portal-home'

export default async function StaffPage() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

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
      title="Staff Workspace"
      description="Staff access is active. Role-specific content can be added here next."
    />
  )
}
