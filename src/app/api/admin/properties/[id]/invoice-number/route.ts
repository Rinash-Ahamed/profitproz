import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { createRevenueInvoiceSequence, logAdminAction } from '@/lib/firestore'
import { parseDateOnly } from '@/lib/date-only'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid property ID is required.' }, { status: 400 })

  let body: { invoiceDate?: unknown; dueDate?: unknown; billingPeriod?: unknown; amount?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invoice details are required.' }, { status: 400 }) }
  const invoiceDate = typeof body.invoiceDate === 'string' ? body.invoiceDate : ''
  const dueDate = typeof body.dueDate === 'string' ? body.dueDate : ''
  const billingPeriod = typeof body.billingPeriod === 'string' ? body.billingPeriod.trim() : ''
  const amount = Number(body.amount)
  if (!parseDateOnly(invoiceDate) || !parseDateOnly(dueDate) || dueDate < invoiceDate || !billingPeriod || billingPeriod.length > 80 || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    return NextResponse.json({ message: 'Enter valid invoice dates, billing period, and amount.' }, { status: 400 })
  }

  try {
    const { sequence, invoice } = await createRevenueInvoiceSequence(id, { invoiceDate, dueDate, billingPeriod, amount })
    await logAdminAction({ actorEmail: user.email, action: 'REVENUE_INVOICE_NUMBER_ASSIGN', targetId: id, details: `Revenue invoice sequence ${String(sequence).padStart(3, '0')} assigned.` })
    return NextResponse.json({ sequence, invoice })
  } catch (error) {
    if (error instanceof Error && error.message === 'PROPERTY_NOT_FOUND') return NextResponse.json({ message: 'Property was not found.' }, { status: 404 })
    if (error instanceof Error && error.message === 'PROPERTY_NOT_ACTIVE') return NextResponse.json({ message: 'Only active revenue-management clients can be invoiced.' }, { status: 400 })
    console.error(`Failed to assign revenue invoice number for ${id}:`, error)
    return NextResponse.json({ message: 'Failed to assign revenue invoice number.' }, { status: 500 })
  }
}
