import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifySessionToken } from '@/lib/auth'
import { listLeaveRequests } from '@/lib/firestore'
export async function GET() { const cookieStore = await cookies(); const user = verifySessionToken(cookieStore.get(authConfig.cookieName)?.value); if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 }); return NextResponse.json({ leaves: await listLeaveRequests() }) }
