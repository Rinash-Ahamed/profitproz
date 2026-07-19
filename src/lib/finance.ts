export type FinanceService = 'revenue_management' | 'ota_onboarding'
export type FinanceInvoiceStatus = 'pending' | 'paid' | 'cancelled'
export type PaymentMethod = 'upi' | 'neft' | 'rtgs' | 'bank_transfer' | 'other'

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
  createdAt?: string
}

export type FinanceOverview = {
  invoices: FinanceInvoiceRecord[]
  payments: FinancePaymentRecord[]
  totalInvoiced: number
  incomeReceived: number
  paidExpenses: number
  unpaidExpenses: number
  netCashBalance: number
  revenueIncome: number
  onboardingIncome: number
}
