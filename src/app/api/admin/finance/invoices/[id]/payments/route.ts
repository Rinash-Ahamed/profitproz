import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import { getFinanceInvoiceById, logAdminAction, recordFinancePayment, syncOnboardingFinancePaymentMarker } from '@/lib/firestore'
import { parseDateOnly } from '@/lib/date-only'
import type { PaymentMethod } from '@/lib/finance'

const methods = new Set<PaymentMethod>(['upi', 'neft', 'rtgs', 'bank_transfer', 'other'])

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid invoice ID is required.' }, { status: 400 })
  try {
    const invoice = await getFinanceInvoiceById(id)
    if (invoice) await syncOnboardingFinancePaymentMarker(invoice)
    return invoice ? NextResponse.json({ invoice }) : NextResponse.json({ message: 'Invoice was not found in Finance.' }, { status: 404 })
  } catch (error) {
    console.error(`Failed to load finance invoice ${id}:`, error)
    return NextResponse.json({ message: 'Failed to load the invoice payment record.' }, { status: 500 })
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid invoice ID is required.' }, { status: 400 })
  let body: { amount?: unknown; paymentDate?: unknown; method?: unknown; reference?: unknown; notes?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ message: 'Invalid payment request.' }, { status: 400 }) }
  const amount = Number(body.amount)
  const paymentDate = typeof body.paymentDate === 'string' ? body.paymentDate : ''
  const method = typeof body.method === 'string' && methods.has(body.method as PaymentMethod) ? body.method as PaymentMethod : null
  const reference = typeof body.reference === 'string' ? body.reference.trim() : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000 || !parseDateOnly(paymentDate) || !method || reference.length > 160 || notes.length > 1000) {
    return NextResponse.json({ message: 'Enter a valid payment amount, date, and method.' }, { status: 400 })
  }
  try {
    const result = await recordFinancePayment(id, { amount, paymentDate, method, reference, notes, recordedBy: user.email })
    await logAdminAction({ actorEmail: user.email, action: 'INVOICE_PAYMENT_RECORD', targetId: id, details: `Payment of ${result.payment.amount} recorded for ${result.invoice.invoiceNumber}.` })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'FINANCE_INVOICE_NOT_FOUND') return NextResponse.json({ message: 'Invoice was not found in Finance.' }, { status: 404 })
    if (error instanceof Error && error.message === 'FINANCE_INVOICE_CLOSED') return NextResponse.json({ message: 'This invoice is already closed.' }, { status: 409 })
    if (error instanceof Error && error.message.startsWith('PAYMENT_MUST_MATCH_BALANCE:')) return NextResponse.json({ message: `Record the full invoice balance of ₹${Number(error.message.split(':')[1]).toLocaleString('en-IN')}. Partial payments are not enabled.` }, { status: 400 })
    console.error(`Failed to record invoice payment ${id}:`, error)
    return NextResponse.json({ message: 'Failed to record payment.' }, { status: 500 })
  }
}
