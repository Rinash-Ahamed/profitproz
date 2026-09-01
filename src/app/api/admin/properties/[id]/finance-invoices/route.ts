import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import { listRevenueFinanceInvoicesForProperty } from '@/lib/firestore'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid property ID is required.' }, { status: 400 })

  try {
    return NextResponse.json({ invoices: await listRevenueFinanceInvoicesForProperty(id) })
  } catch (error) {
    console.error(`Failed to load Revenue invoices for property ${id}:`, error)
    return NextResponse.json({ message: 'Failed to load the property invoices.' }, { status: 500 })
  }
}
