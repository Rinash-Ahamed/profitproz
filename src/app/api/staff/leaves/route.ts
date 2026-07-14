import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { createLeaveRequest, listLeaveRequests } from '@/lib/firestore'

export async function GET() {
  const cookieStore = await cookies(); const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'staff' })
  if (!user || user.role !== 'staff') return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  return NextResponse.json({ leaves: await listLeaveRequests(user.email) })
}
export async function POST(request: Request) {
  const cookieStore = await cookies(); const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'staff' })
  if (!user || user.role !== 'staff') return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  let body: { startDate?: unknown; endDate?: unknown; reason?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid leave request.' }, { status: 400 }) }
  const startDate = typeof body.startDate === 'string' ? body.startDate : ''
  const endDate = typeof body.endDate === 'string' ? body.endDate : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !reason || reason.length > 2000 || endDate < startDate) return NextResponse.json({ message: 'Enter valid leave dates and a reason.' }, { status: 400 })
  return NextResponse.json({ leave: await createLeaveRequest({ staffEmail: user.email, startDate, endDate, reason }) }, { status: 201 })
}
