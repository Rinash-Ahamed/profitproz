import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { listOnboardings, listOnboardingsPage } from '@/lib/firestore'
import { readPagination } from '@/lib/pagination'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value)
  if (!user) return NextResponse.json({ message: 'Authentication is required.' }, { status: 401 })

  try {
    const pagination = readPagination(request)
    const page = pagination ? await listOnboardingsPage(pagination) : null
    const onboardings = page?.items || await listOnboardings()
    onboardings.sort((a, b) => a.propertyName.localeCompare(b.propertyName))

    if (user.role === 'admin') return NextResponse.json({ onboardings, ...(page ? { nextCursor: page.nextCursor } : {}) })

    return NextResponse.json({
      onboardings: onboardings.map((record) => ({
        ...record,
        ratePerPlatform: 0,
        invoiceNotes: '',
      })), ...(page ? { nextCursor: page.nextCursor } : {}),
    })
  } catch (error) {
    console.error('Failed to list OTA onboardings:', error)
    return NextResponse.json({ message: 'Failed to load OTA onboardings.' }, { status: 500 })
  }
}
