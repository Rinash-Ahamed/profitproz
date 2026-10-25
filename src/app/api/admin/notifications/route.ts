import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import { getAdminNotificationUnreadCount, listAdminNotifications, updateAdminNotifications } from '@/lib/firestore'

const headers = { 'Cache-Control': 'private, no-store' }
const validId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)

export async function GET(request: Request) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403, headers })
  const params = new URL(request.url).searchParams
  const cursor = params.get('cursor') || ''
  const view = params.get('view') || ''
  if (!['', 'unread'].includes(view) || (cursor && (!validId(cursor) || view === 'unread'))) return NextResponse.json({ message: 'Invalid notification page.' }, { status: 400, headers })
  try {
    if (view === 'unread') return NextResponse.json({ unreadCount: await getAdminNotificationUnreadCount(user.email) }, { headers })
    return NextResponse.json(await listAdminNotifications(user.email, cursor), { headers })
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_NOTIFICATION_CURSOR') return NextResponse.json({ message: 'Invalid notification page.' }, { status: 400, headers })
    console.error('Failed to load admin notifications:', error)
    return NextResponse.json({ message: 'Unable to load notifications.' }, { status: 500, headers })
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403, headers })
  let action: 'read' | 'clear'
  let throughId: string
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object') throw new Error('INVALID_BODY')
    const input = body as { action?: unknown; throughId?: unknown }
    if ((input.action !== 'read' && input.action !== 'clear') || !validId(input.throughId)) throw new Error('INVALID_BODY')
    action = input.action
    throughId = input.throughId
  } catch { return NextResponse.json({ message: 'Choose a valid notification action.' }, { status: 400, headers }) }
  try {
    await updateAdminNotifications(user.email, action, throughId)
    return NextResponse.json({ success: true }, { headers })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOTIFICATION_NOT_FOUND') return NextResponse.json({ message: 'Notification was not found. Refresh and try again.' }, { status: 404, headers })
    console.error('Failed to update admin notifications:', error)
    return NextResponse.json({ message: 'Unable to update notifications.' }, { status: 500, headers })
  }
}
