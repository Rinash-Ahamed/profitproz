import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { clearAuditLogs, logAdminAction, pruneOldAuditLogs } from '@/lib/firestore'

async function requireAdmin() {
  const cookieStore = await cookies()
  const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)

  return user?.role === 'admin' ? user : null
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

  const deleted = await clearAuditLogs()

  await logAdminAction({
    actorEmail: user.email,
    action: 'AUDIT_LOG_CLEAR',
    targetId: 'audit_log',
    details: `Admin cleared ${deleted} audit log records.`,
  })

  return NextResponse.json({ deleted })
}
