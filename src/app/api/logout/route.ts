import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ ok: true })

  response.cookies.set(authConfig.cookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  })

  return response
}
