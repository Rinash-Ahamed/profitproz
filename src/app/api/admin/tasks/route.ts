import { NextResponse } from 'next/server'
import { listWorkSessions, listWorkSessionsPage } from '@/lib/firestore'
import { readPagination } from '@/lib/pagination'
import { requireAdminSession } from '@/lib/api-auth'

export async function GET(request: Request) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  try {
    const pagination = readPagination(request)
    if (pagination) {
      const page = await listWorkSessionsPage(pagination)
      return NextResponse.json({ workSessions: page.items, nextCursor: page.nextCursor })
    }
    return NextResponse.json({ workSessions: await listWorkSessions() })
  } catch (error) {
    console.error('Failed to load Admin work sessions:', error)
    return NextResponse.json({ message: 'Unable to load employee work logs.' }, { status: 500 })
  }
}
