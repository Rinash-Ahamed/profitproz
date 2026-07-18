import { NextResponse } from 'next/server'
import { createOnboarding, listOnboardings, listOnboardingsPage, logAdminAction } from '@/lib/firestore'
import { parseOnboardingDetails } from '@/lib/onboarding-validation'
import { readPagination } from '@/lib/pagination'
import { requireAdminSession as requireAdmin, requireClientServiceEditor } from '@/lib/api-auth'

export async function GET(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  try {
    const pagination = readPagination(request)
    if (pagination) {
      const page = await listOnboardingsPage(pagination)
      page.items.sort((a, b) => a.propertyName.localeCompare(b.propertyName))
      return NextResponse.json({ onboardings: page.items, nextCursor: page.nextCursor })
    }
    const onboardings = await listOnboardings()
    onboardings.sort((a, b) => a.propertyName.localeCompare(b.propertyName))
    return NextResponse.json({ onboardings })
  } catch (error) {
    console.error('Failed to list OTA onboardings:', error)
    return NextResponse.json({ message: 'Failed to load OTA onboardings.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const user = await requireClientServiceEditor('otaOnboarding')
  if (!user) return NextResponse.json({ message: 'OTA Onboarding access is required.' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid onboarding request.' }, { status: 400 })
  }

  const parsed = parseOnboardingDetails(body)
  if (!parsed.value || parsed.error) return NextResponse.json({ message: parsed.error || 'Invalid onboarding request.' }, { status: 400 })

  try {
    const onboarding = await createOnboarding(parsed.value)
    await logAdminAction({
      actorEmail: user.email,
      action: 'ONBOARDING_CREATE',
      targetId: onboarding.id,
      details: `${user.role === 'admin' ? 'Admin' : 'Employee'} created OTA onboarding for ${onboarding.propertyName}.`,
    })
    return NextResponse.json({ onboarding }, { status: 201 })
  } catch (error) {
    console.error('Failed to create OTA onboarding:', error)
    return NextResponse.json({ message: 'Failed to create OTA onboarding.' }, { status: 500 })
  }
}
