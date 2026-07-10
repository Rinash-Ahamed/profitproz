import type { Metadata } from 'next'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Login - ProfitPro',
  description: 'Admin and Staff login for ProfitPro.',
}

export default function LoginPage() {
  return <LoginForm />
}
