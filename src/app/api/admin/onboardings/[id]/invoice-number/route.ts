import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { completeOnboardingInvoicePayment, getOrCreateOnboardingInvoiceSequence, logAdminAction } from '@/lib/firestore'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value)
  if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid onboarding ID is required.' }, { status: 400 })

  try {
    const { sequence, onboarding } = await getOrCreateOnboardingInvoiceSequence(id)
    await logAdminAction({
      actorEmail: user.email,
      action: 'ONBOARDING_INVOICE_NUMBER_ASSIGN',
      targetId: id,
      details: `OTA onboarding invoice sequence ${String(sequence).padStart(3, '0')} assigned.`,
    })
    return NextResponse.json({ sequence, onboarding })
  } catch (error) {
    if (error instanceof Error && error.message === 'ONBOARDING_NOT_FOUND') {
      return NextResponse.json({ message: 'Onboarding record was not found.' }, { status: 404 })
    }
    console.error(`Failed to assign OTA invoice number for ${id}:`, error)
    return NextResponse.json({ message: 'Failed to assign invoice number.' }, { status: 500 })
  }
}

export async function PATCH(_request: Request, context: RouteContext) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid onboarding ID is required.' }, { status: 400 })

  try {
    const onboarding = await completeOnboardingInvoicePayment(id)
    await logAdminAction({
      actorEmail: user.email,
      action: 'ONBOARDING_PAYMENT_COMPLETE',
      targetId: id,
      details: `Admin marked OTA onboarding invoice payment complete for ${onboarding.propertyName}.`,
    })
    return NextResponse.json({ onboarding })
  } catch (error) {
    if (error instanceof Error && error.message === 'ONBOARDING_NOT_FOUND') return NextResponse.json({ message: 'Onboarding record was not found.' }, { status: 404 })
    if (error instanceof Error && error.message === 'ONBOARDING_INVOICE_NOT_GENERATED') return NextResponse.json({ message: 'Generate the invoice before completing payment.' }, { status: 400 })
    console.error(`Failed to complete OTA invoice payment for ${id}:`, error)
    return NextResponse.json({ message: 'Failed to update invoice payment.' }, { status: 500 })
  }
}
