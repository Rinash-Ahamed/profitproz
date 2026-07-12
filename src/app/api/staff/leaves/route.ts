import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { createLeaveRequest, listLeaveRequests } from '@/lib/firestore'

export async function GET() {
  const cookieStore = await cookies(); const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)
  if (!user || user.role !== 'staff') return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  return NextResponse.json({ leaves: await listLeaveRequests(user.email) })
}
export async function POST(request: Request) {
  const cookieStore = await cookies(); const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value)
  if (!user || user.role !== 'staff') return NextResponse.json({ message: 'Employee access is required.' }, { status: 403 })
  const body = await request.json() as { startDate?: string; endDate?: string; reason?: string }
  if (!body.startDate || !body.endDate || !body.reason?.trim() || body.endDate < body.startDate) return NextResponse.json({ message: 'Enter valid leave dates and a reason.' }, { status: 400 })
  return NextResponse.json({ leave: await createLeaveRequest({ staffEmail: user.email, startDate: body.startDate, endDate: body.endDate, reason: body.reason }) }, { status: 201 })
}
