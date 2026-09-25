import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import { getFinancialExportData, logAdminAction } from '@/lib/firestore'
import { roundCurrency, sumCurrency } from '@/lib/finance'

const HEADERS = [
  'Record Type', 'Date / Period', 'Reference', 'Client / Employee', 'Property', 'Category / Service', 'Status',
  'Invoice Amount', 'Income Received', 'Expense Amount', 'Gross Payroll', 'Payroll Deduction', 'Net Payroll',
  'Outstanding Balance', 'Commission Percent', 'Monthly Salary', 'Annual CTC', 'Payment Status', 'Payment Method',
  'Payment Reference', 'Due Date', 'Billing Period', 'City', 'GST Number', 'Room Count', 'Email', 'Notes',
  'Document Link', 'Record ID',
] as const

type CsvRow = Partial<Record<(typeof HEADERS)[number], string | number>>

function csvCell(value: unknown) {
  let text = String(value ?? '')
  // Prevent values from being interpreted as spreadsheet formulas when opened.
  if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

function serviceLabel(service: string) {
  return service === 'ota_onboarding' ? 'OTA Onboarding' : 'Revenue Management'
}

export async function GET() {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  try {
    const data = await getFinancialExportData()
    const activeInvoices = data.invoices.filter((invoice) => invoice.status !== 'cancelled')
    const approvedExpenses = data.expenses.filter((expense) => expense.status === 'approved')
    const paidExpenses = data.expenses.filter((expense) => expense.paymentStatus === 'paid')
    const paidPayroll = data.payroll.filter((record) => record.status === 'paid')
    const summary: CsvRow[] = [
      { 'Record Type': 'Summary', 'Category / Service': 'Total invoiced', 'Invoice Amount': sumCurrency(activeInvoices.map((record) => record.amount)) },
      { 'Record Type': 'Summary', 'Category / Service': 'Income received', 'Income Received': sumCurrency(data.payments.map((record) => record.amount)) },
      { 'Record Type': 'Summary', 'Category / Service': 'Approved expenses', 'Expense Amount': sumCurrency(approvedExpenses.map((record) => record.amount)) },
      { 'Record Type': 'Summary', 'Category / Service': 'Paid expenses', 'Expense Amount': sumCurrency(paidExpenses.map((record) => record.amount)) },
      { 'Record Type': 'Summary', 'Category / Service': 'Paid payroll', 'Net Payroll': sumCurrency(paidPayroll.map((record) => record.netSalary)) },
      {
        'Record Type': 'Summary',
        'Category / Service': 'Net cash balance',
        'Income Received': roundCurrency(sumCurrency(data.payments.map((record) => record.amount)) - sumCurrency(paidExpenses.map((record) => record.amount)) - sumCurrency(paidPayroll.map((record) => record.netSalary))),
      },
    ]
    const rows: CsvRow[] = [
      ...summary,
      ...data.properties.map((property): CsvRow => ({
        'Record Type': 'Client Commercial Terms', 'Date / Period': property.contractStartDate, Reference: property.contractNumber,
        'Client / Employee': property.contactName, Property: property.name, 'Category / Service': property.propertyType,
        Status: property.status, 'Commission Percent': property.commissionPercent, City: property.city,
        'GST Number': property.gstNumber, 'Room Count': property.roomCount, Email: property.contactEmail,
        Notes: property.notes, 'Document Link': property.signedContractUrl, 'Record ID': property.id,
      })),
      ...data.invoices.map((invoice): CsvRow => ({
        'Record Type': 'Client Invoice', 'Date / Period': invoice.invoiceDate, Reference: invoice.invoiceNumber,
        'Client / Employee': invoice.clientName, Property: invoice.propertyName, 'Category / Service': serviceLabel(invoice.service),
        Status: invoice.status, 'Invoice Amount': invoice.amount, 'Income Received': invoice.paidAmount,
        'Outstanding Balance': invoice.balanceAmount, 'Due Date': invoice.dueDate, 'Billing Period': invoice.billingPeriod,
        Notes: invoice.otaSnapshot?.invoiceNotes || '', 'Document Link': invoice.reportUrl || '', 'Record ID': invoice.id,
      })),
      ...data.payments.map((payment): CsvRow => ({
        'Record Type': 'Received Payment', 'Date / Period': payment.paymentDate, Reference: payment.invoiceNumber,
        'Category / Service': serviceLabel(payment.service), Status: 'received', 'Income Received': payment.amount,
        'Payment Method': payment.method, 'Payment Reference': payment.reference, Email: payment.recordedBy,
        Notes: payment.notes, 'Record ID': payment.id,
      })),
      ...data.expenses.map((expense): CsvRow => ({
        'Record Type': 'Expense', 'Date / Period': expense.expenseDate, Reference: expense.title || expense.id,
        'Client / Employee': expense.staffName || expense.staffEmail,
        'Category / Service': expense.expenseType === 'other' ? expense.customExpenseType || 'Other' : expense.expenseType,
        Status: expense.status, 'Expense Amount': expense.amount, 'Payment Status': expense.paymentStatus,
        City: expense.city, Email: expense.staffEmail, Notes: expense.description || expense.notes,
        'Document Link': expense.receiptUrl || '', 'Record ID': expense.id,
      })),
      ...data.salaries.map((salary): CsvRow => ({
        'Record Type': 'Salary Setting', 'Date / Period': salary.updatedAt || '', 'Client / Employee': salary.staffEmail,
        'Category / Service': 'Employee salary', 'Monthly Salary': salary.baseSalary, 'Annual CTC': roundCurrency(salary.baseSalary * 12),
        Email: salary.staffEmail, Notes: salary.notes, 'Record ID': salary.id,
      })),
      ...data.payroll.map((payroll): CsvRow => ({
        'Record Type': 'Payroll', 'Date / Period': payroll.month, Reference: payroll.employeeId,
        'Client / Employee': payroll.employeeName, 'Category / Service': payroll.department || payroll.designation,
        Status: payroll.status, 'Gross Payroll': payroll.grossSalary, 'Payroll Deduction': payroll.lopDeduction,
        'Net Payroll': payroll.netSalary, 'Monthly Salary': payroll.monthlySalary, 'Annual CTC': payroll.annualCtc,
        'Payment Status': payroll.status === 'paid' ? 'paid' : 'unpaid', Email: payroll.staffEmail,
        Notes: `Payable days: ${payroll.payableDays}; LOP days: ${payroll.lopDays}`, 'Record ID': payroll.id,
      })),
    ]

    const csv = ['sep=,', HEADERS.map(csvCell).join(','), ...rows.map((row) => HEADERS.map((header) => csvCell(row[header])).join(','))].join('\r\n')
    await logAdminAction({
      actorEmail: user.email,
      action: 'FINANCE_CSV_EXPORT',
      targetId: 'finance',
      details: `Admin exported ${rows.length} financial CSV rows.`,
    })
    const date = new Date().toISOString().slice(0, 10)
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="profitpro-financial-export-${date}.csv"`,
      },
    })
  } catch (error) {
    console.error('Failed to export financial information:', error)
    return NextResponse.json({ message: 'Failed to export financial information.' }, { status: 500 })
  }
}
