import { NextResponse } from 'next/server'
import { clearAuditLogs, listAuditLogsPage, logAdminAction, pruneOldAuditLogs } from '@/lib/firestore'
import { requireAdminSession as requireAdmin } from '@/lib/api-auth'

export async function GET(request: Request) {
  const user = await requireAdmin()

  if (!user) {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  try {
    const cursor = new URL(request.url).searchParams.get('cursor')?.slice(0, 200) || undefined
    const page = await listAuditLogsPage({ cursor, limit: 10 })
    return NextResponse.json({ logs: page.items, nextCursor: page.nextCursor })
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_AUDIT_CURSOR') {
      return NextResponse.json({ message: 'The audit page cursor is invalid.' }, { status: 400 })
    }
    console.error('Failed to load audit logs:', error)
    return NextResponse.json({ message: 'Unable to load audit logs.' }, { status: 500 })
  }
}

export async function POST() {
  const user = await requireAdmin()

  if (!user) {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  const deleted = await pruneOldAuditLogs()
  return NextResponse.json({ deleted })
}

export async function DELETE() {
  const user = await requireAdmin()

  if (!user) {
    return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_AUDIT_LOG_CLEAR !== 'true') {
    return NextResponse.json({ message: 'Audit log deletion is disabled.' }, { status: 403 })
  }

  const deleted = await clearAuditLogs()

  await logAdminAction({
    actorEmail: user.email,
    action: 'AUDIT_LOG_CLEAR',
    targetId: 'audit_log',
    details: `Admin cleared ${deleted} audit log records.`,
  })

  return NextResponse.json({ deleted })
}
