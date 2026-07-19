import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import { getFinanceOverview } from '@/lib/firestore'

export async function GET() {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  try {
    return NextResponse.json({ finance: await getFinanceOverview() })
  } catch (error) {
    console.error('Failed to load finance overview:', error)
    return NextResponse.json({ message: 'Failed to load finance information.' }, { status: 500 })
  }
}
