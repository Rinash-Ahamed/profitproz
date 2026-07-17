import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { getOrCreateOnboardingInvoiceSequence, logAdminAction } from '@/lib/firestore'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value)
  if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid onboarding ID is required.' }, { status: 400 })

  try {
    const sequence = await getOrCreateOnboardingInvoiceSequence(id)
    await logAdminAction({
      actorEmail: user.email,
      action: 'ONBOARDING_INVOICE_NUMBER_ASSIGN',
      targetId: id,
      details: `OTA onboarding invoice sequence ${String(sequence).padStart(3, '0')} assigned.`,
    })
    return NextResponse.json({ sequence })
  } catch (error) {
    if (error instanceof Error && error.message === 'ONBOARDING_NOT_FOUND') {
      return NextResponse.json({ message: 'Onboarding record was not found.' }, { status: 404 })
    }
    console.error(`Failed to assign OTA invoice number for ${id}:`, error)
    return NextResponse.json({ message: 'Failed to assign invoice number.' }, { status: 500 })
  }
}
