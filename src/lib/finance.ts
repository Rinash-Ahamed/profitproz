export type FinanceService = 'revenue_management' | 'ota_onboarding'
export type FinanceInvoiceStatus = 'pending' | 'paid' | 'cancelled'
export type PaymentMethod = 'upi' | 'neft' | 'rtgs' | 'bank_transfer' | 'other'

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function sumCurrency(values: number[]) {
  return values.reduce((totalPaise, value) => totalPaise + Math.round(value * 100), 0) / 100
}

export type FinanceInvoiceRecord = {
  id: string
  service: FinanceService
  sourceId: string
  invoiceNumber: string
  clientName: string
  propertyName: string
  invoiceDate: string
  dueDate: string
  billingPeriod: string
  amount: number
  paidAmount: number
  balanceAmount: number
  status: FinanceInvoiceStatus
  createdAt?: string
  updatedAt?: string
  paidAt?: string
  otaSnapshot?: {
    propertyAddress: string
    emailAddress: string
    phone: string
    platforms: OtaPlatform[]
    ratePerPlatform: number
    invoiceNotes: string
  }
}

export type FinancePaymentRecord = {
  id: string
  invoiceId: string
  service: FinanceService
  invoiceNumber: string
  amount: number
  paymentDate: string
  method: PaymentMethod
  reference: string
  notes: string
  recordedBy: string
  correctedBy?: string
  createdAt?: string
  updatedAt?: string
}

export type FinanceOverview = {
  invoices: FinanceInvoiceRecord[]
  payments: FinancePaymentRecord[]
  totalInvoiced: number
  incomeReceived: number
  paidExpenses: number
  paidPayroll: number
  unpaidExpenses: number
  netCashBalance: number
  revenueIncome: number
  onboardingIncome: number
  invoicesTruncated: boolean
  paymentsTruncated: boolean
}
import type { OtaPlatform } from './onboarding'
