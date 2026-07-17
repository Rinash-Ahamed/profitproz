import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { deleteOnboarding, logAdminAction, updateOnboardingDetails, updateOnboardingPlatform } from '@/lib/firestore'
import { parseOnboardingDetails, parseOnboardingProgress } from '@/lib/onboarding-validation'

type RouteContext = { params: Promise<{ id: string }> }

async function requireAdmin() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value)
  return user?.role === 'admin' ? user : null
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid onboarding ID is required.' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid onboarding update.' }, { status: 400 })
  }

  const updatesDetails = Boolean(body && typeof body === 'object' && !Array.isArray(body) && (body as Record<string, unknown>).action === 'details')
  const parsedDetails = updatesDetails ? parseOnboardingDetails(body) : null
  const parsedProgress = updatesDetails ? null : parseOnboardingProgress(body)
  const parsed = parsedDetails || parsedProgress
  if (!parsed?.value || parsed.error) return NextResponse.json({ message: parsed?.error || 'Invalid onboarding update.' }, { status: 400 })

  try {
    if (updatesDetails && parsedDetails?.value) {
      const onboarding = await updateOnboardingDetails(id, parsedDetails.value)
      await logAdminAction({
        actorEmail: user.email,
        action: 'ONBOARDING_DETAILS_UPDATE',
        targetId: id,
        details: `Admin updated onboarding and invoice details for ${onboarding.propertyName}.`,
      })
      return NextResponse.json({ onboarding })
    }

    if (!parsedProgress?.value) return NextResponse.json({ message: 'Invalid onboarding update.' }, { status: 400 })
    const onboarding = await updateOnboardingPlatform(id, parsedProgress.value)
    await logAdminAction({
      actorEmail: user.email,
      action: 'ONBOARDING_PLATFORM_UPDATE',
      targetId: id,
      details: `Admin marked ${parsedProgress.value.platform} as ${parsedProgress.value.status} for ${onboarding.propertyName}.`,
    })
    return NextResponse.json({ onboarding })
  } catch (error) {
    if (error instanceof Error && (error.message === 'ONBOARDING_NOT_FOUND' || error.message === 'ONBOARDING_PLATFORM_NOT_FOUND')) {
      return NextResponse.json({ message: 'Onboarding record or platform was not found.' }, { status: 404 })
    }
    console.error(`Failed to update OTA onboarding ${id}:`, error)
    return NextResponse.json({ message: 'Failed to update OTA onboarding.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid onboarding ID is required.' }, { status: 400 })

  try {
    await deleteOnboarding(id)
    await logAdminAction({ actorEmail: user.email, action: 'ONBOARDING_DELETE', targetId: id, details: 'Admin deleted an OTA onboarding record.' })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'ONBOARDING_NOT_FOUND') return NextResponse.json({ message: 'Onboarding record was not found.' }, { status: 404 })
    console.error(`Failed to delete OTA onboarding ${id}:`, error)
    return NextResponse.json({ message: 'Failed to delete OTA onboarding.' }, { status: 500 })
  }
}
