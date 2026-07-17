import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { getDashboardSummary } from '@/lib/firestore'

export async function GET() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value)
  if (!user) return NextResponse.json({ message: 'Authentication is required.' }, { status: 401 })
  try {
    const summary = await getDashboardSummary(user.role === 'staff' ? user.email : undefined)
    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Failed to load dashboard summary:', error)
    return NextResponse.json({ message: 'Failed to load dashboard summary.' }, { status: 500 })
  }
}
