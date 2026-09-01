import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import { cancelRevenueFinanceInvoice } from '@/lib/firestore'

export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid invoice ID is required.' }, { status: 400 })

  try {
    return NextResponse.json({ invoice: await cancelRevenueFinanceInvoice(id, user.email) })
  } catch (error) {
    if (error instanceof Error && error.message === 'FINANCE_INVOICE_NOT_FOUND') return NextResponse.json({ message: 'Invoice was not found in Finance.' }, { status: 404 })
    if (error instanceof Error && error.message === 'FINANCE_INVOICE_CANCEL_UNSUPPORTED') return NextResponse.json({ message: 'Only Revenue Management invoices can be cancelled here.' }, { status: 400 })
    if (error instanceof Error && error.message === 'FINANCE_INVOICE_ALREADY_CANCELLED') return NextResponse.json({ message: 'This invoice is already cancelled.' }, { status: 409 })
    if (error instanceof Error && error.message === 'FINANCE_INVOICE_HAS_PAYMENT') return NextResponse.json({ message: 'A paid invoice cannot be cancelled.' }, { status: 409 })
    console.error(`Failed to cancel revenue invoice ${id}:`, error)
    return NextResponse.json({ message: 'Failed to cancel the invoice.' }, { status: 500 })
  }
}
