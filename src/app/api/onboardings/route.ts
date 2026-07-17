import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { listOnboardings } from '@/lib/firestore'

export async function GET() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value)
  if (!user) return NextResponse.json({ message: 'Authentication is required.' }, { status: 401 })

  try {
    const onboardings = await listOnboardings()
    onboardings.sort((a, b) => a.propertyName.localeCompare(b.propertyName))

    if (user.role === 'admin') return NextResponse.json({ onboardings })

    return NextResponse.json({
      onboardings: onboardings.map((record) => ({
        ...record,
        ratePerPlatform: 0,
        invoiceNotes: '',
      })),
    })
  } catch (error) {
    console.error('Failed to list OTA onboardings:', error)
    return NextResponse.json({ message: 'Failed to load OTA onboardings.' }, { status: 500 })
  }
}
