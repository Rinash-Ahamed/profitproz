import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import { getFinanceOverview, listFinancePage, financePaymentTotal } from '@/lib/firestore'
import { parseDateOnly } from '@/lib/date-only'
import { timedApiResponse } from '@/lib/api-timing'

export async function GET(request: Request) {
  return timedApiResponse('GET /api/admin/finance', async () => {
    const user = await requireAdminSession()
    if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
    const params = new URL(request.url).searchParams
    const view = params.get('view') || ''
    const input = { service: params.get('service') || 'all', status: params.get('status') || 'all', search: params.get('search') || '', from: params.get('from') || '', to: params.get('to') || '', cursor: params.get('cursor') || '', limit: params.get('limit') === '100' ? 100 : 10 }
    if (!['', 'summary', 'invoices', 'payments', 'payment-total'].includes(view) || !['all', 'revenue_management', 'ota_onboarding'].includes(input.service) || !['all', 'pending', 'paid'].includes(input.status) || input.search.length > 120 || input.cursor.length > 2000 || (input.from && !parseDateOnly(input.from)) || (input.to && !parseDateOnly(input.to)) || (input.from && input.to && input.from > input.to)) return NextResponse.json({ message: 'Invalid Finance filters.' }, { status: 400 })
    try {
      if (view === 'invoices' || view === 'payments') return NextResponse.json(await listFinancePage({ ...input, kind: view }), { headers: { 'Cache-Control': 'private, no-store' } })
      if (view === 'payment-total') return NextResponse.json({ total: await financePaymentTotal(input) }, { headers: { 'Cache-Control': 'private, no-store' } })
      return NextResponse.json({ finance: await getFinanceOverview(view !== 'summary') }, { headers: { 'Cache-Control': 'private, no-store' } })
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_FINANCE_CURSOR') return NextResponse.json({ message: 'Invalid Finance page.' }, { status: 400 })
      console.error('Failed to load finance overview:', error)
      return NextResponse.json({ message: 'Failed to load finance information.' }, { status: 500 })
    }
  })
}
