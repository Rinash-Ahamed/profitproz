import type { Metadata } from 'next'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Login - ProfitPro',
  description: 'Admin and Staff login for ProfitPro.',
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const params = await searchParams
  return <LoginForm notice={params.reason === 'session-expired' ? 'Your session expired. Please sign in again.' : ''} />
}
