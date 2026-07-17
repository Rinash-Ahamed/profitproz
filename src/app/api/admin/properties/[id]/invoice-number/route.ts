import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { createRevenueInvoiceSequence, logAdminAction } from '@/lib/firestore'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid property ID is required.' }, { status: 400 })

  try {
    const sequence = await createRevenueInvoiceSequence(id)
    await logAdminAction({ actorEmail: user.email, action: 'REVENUE_INVOICE_NUMBER_ASSIGN', targetId: id, details: `Revenue invoice sequence ${String(sequence).padStart(3, '0')} assigned.` })
    return NextResponse.json({ sequence })
  } catch (error) {
    if (error instanceof Error && error.message === 'PROPERTY_NOT_FOUND') return NextResponse.json({ message: 'Property was not found.' }, { status: 404 })
    if (error instanceof Error && error.message === 'PROPERTY_NOT_ACTIVE') return NextResponse.json({ message: 'Only active revenue-management clients can be invoiced.' }, { status: 400 })
    console.error(`Failed to assign revenue invoice number for ${id}:`, error)
    return NextResponse.json({ message: 'Failed to assign revenue invoice number.' }, { status: 500 })
  }
}
