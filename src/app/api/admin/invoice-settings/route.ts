import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'

export async function GET() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  return NextResponse.json({
    settings: {
      accountName: process.env.INVOICE_ACCOUNT_NAME?.trim() || '',
      bankName: process.env.INVOICE_BANK_NAME?.trim() || '',
      accountNumber: process.env.INVOICE_ACCOUNT_NUMBER?.trim() || '',
      ifscCode: process.env.INVOICE_IFSC_CODE?.trim() || '',
      upiVpa: process.env.INVOICE_UPI_VPA?.trim() || '',
      upiNumber: process.env.INVOICE_UPI_NUMBER?.trim() || '',
      companyAddress: process.env.INVOICE_COMPANY_ADDRESS?.trim() || '',
    },
  })
}
