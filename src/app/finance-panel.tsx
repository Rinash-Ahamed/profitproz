'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, FileDown, Loader2, RefreshCw, Search } from 'lucide-react'
import type { FinanceInvoiceRecord, FinanceOverview, FinanceService } from '@/lib/finance'
import { authenticatedFetch as fetch } from '@/lib/client-api'
import { formatDateOnlyDisplay } from '@/lib/date-only'
import { RecordPaymentModal } from '@/components/finance/RecordPaymentModal'

const emptyOverview: FinanceOverview = { invoices: [], payments: [], totalInvoiced: 0, incomeReceived: 0, paidExpenses: 0, unpaidExpenses: 0, netCashBalance: 0, revenueIncome: 0, onboardingIncome: 0 }
const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export function FinancePanel() {
  const [finance, setFinance] = useState<FinanceOverview>(emptyOverview)
  const [service, setService] = useState<'all' | FinanceService>('all')
  const [status, setStatus] = useState<'all' | 'pending' | 'paid'>('all')
  const [search, setSearch] = useState('')
  const [paymentInvoice, setPaymentInvoice] = useState<FinanceInvoiceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/admin/finance', { cache: 'no-store' })
      const data = await response.json() as { finance?: FinanceOverview; message?: string }
      if (!response.ok || !data.finance) throw new Error(data.message || 'Failed to load Finance.')
      setFinance(data.finance)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Failed to load Finance.') } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const invoices = useMemo(() => {
    const query = search.trim().toLowerCase()
    return finance.invoices
      .filter((invoice) => service === 'all' || invoice.service === service)
      .filter((invoice) => status === 'all' || invoice.status === status)
      .filter((invoice) => !query || [invoice.invoiceNumber, invoice.clientName, invoice.propertyName].some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => {
        if (query) {
          const aPropertyMatch = a.propertyName.toLowerCase().startsWith(query)
          const bPropertyMatch = b.propertyName.toLowerCase().startsWith(query)
          if (aPropertyMatch !== bPropertyMatch) return aPropertyMatch ? -1 : 1
        }
        return (b.invoiceDate || b.createdAt || '').localeCompare(a.invoiceDate || a.createdAt || '')
      })
  }, [finance.invoices, search, service, status])

  function exportIncome() {
    if (!finance.payments.length) { setError('No received payments are available to export.'); return }
    const cell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = finance.payments.map((payment) => [payment.paymentDate, payment.invoiceNumber, payment.service === 'ota_onboarding' ? 'OTA Onboarding' : 'Revenue Management', payment.amount, payment.method, payment.reference, payment.recordedBy, payment.notes].map(cell).join(','))
    const csv = ['sep=,', 'Payment Date,Invoice Number,Service,Amount,Method,Reference,Recorded By,Notes', ...rows].join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a'); link.href = url; link.download = 'income-payments.csv'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
  }

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <FinanceMetric label="Income received" value={money(finance.incomeReceived)} detail="Payments actually received" />
      <FinanceMetric label="Unpaid expenses" value={money(finance.unpaidExpenses)} detail="Approved expenses awaiting payment" />
      <FinanceMetric label="Expenses paid" value={money(finance.paidExpenses)} detail="Cash expenses and reimbursements" />
      <FinanceMetric label="Remaining balance" value={money(finance.netCashBalance)} detail="Received income - paid expenses" primary />
    </div>

    <section className="surface rounded-lg p-6"><p className="font-semibold text-ink">Income by service</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-zinc-800 p-3"><p className="text-xs text-sub">Revenue Management</p><p className="mt-1 font-semibold text-ink">{money(finance.revenueIncome)}</p></div><div className="rounded-lg border border-zinc-800 p-3"><p className="text-xs text-sub">OTA Onboarding</p><p className="mt-1 font-semibold text-ink">{money(finance.onboardingIncome)}</p></div></div></section>

    {message ? <p className="rounded-lg border border-[#66B159]/30 bg-[#66B159]/10 px-4 py-3 text-sm text-ink">{message}</p> : null}
    {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

    <section className="surface rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 p-6"><div><p className="text-lg font-semibold text-ink">Client invoices</p><p className="mt-1 text-sm text-sub">Immutable invoice amounts and payment balances by service.</p></div><div className="flex flex-wrap gap-2"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-64 max-w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-sm text-ink placeholder:text-ghost focus:border-[#66B159] focus:outline-none" placeholder="Search invoice or property" aria-label="Search Finance invoices" /></label><select value={service} onChange={(event) => setService(event.target.value as typeof service)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink" aria-label="Filter invoices by service"><option value="all">All services</option><option value="revenue_management">Revenue Management</option><option value="ota_onboarding">OTA Onboarding</option></select><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink" aria-label="Filter invoices by payment status"><option value="all">All payment statuses</option><option value="pending">Payment pending</option><option value="paid">Paid</option></select><button type="button" onClick={() => void load()} className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm text-sub hover:text-ink"><RefreshCw className="h-4 w-4" /> Refresh</button></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="border-b border-zinc-700 text-left"><tr><th className="px-5 py-4 font-medium text-sub">Invoice</th><th className="px-5 py-4 font-medium text-sub">Client</th><th className="px-5 py-4 font-medium text-sub">Service</th><th className="px-5 py-4 font-medium text-sub">Dates</th><th className="px-5 py-4 font-medium text-sub">Amount</th><th className="px-5 py-4 font-medium text-sub">Paid / Balance</th><th className="px-5 py-4 font-medium text-sub">Status</th><th className="px-5 py-4 font-medium text-sub">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-sub" /></td></tr> : invoices.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-sub">No tracked invoices yet. New invoices appear here when generated.</td></tr> : invoices.map((invoice) => <tr key={invoice.id} className="border-b border-zinc-800 last:border-none"><td className="px-5 py-4 font-medium text-ink">{invoice.invoiceNumber}</td><td className="px-5 py-4"><p className="text-ink">{invoice.propertyName}</p><p className="text-xs text-sub">{invoice.clientName}</p></td><td className="px-5 py-4 text-sub">{invoice.service === 'ota_onboarding' ? 'OTA Onboarding' : 'Revenue Management'}</td><td className="px-5 py-4 text-xs text-sub"><p>{formatDateOnlyDisplay(invoice.invoiceDate)}</p><p>Due {formatDateOnlyDisplay(invoice.dueDate)}</p>{invoice.billingPeriod ? <p>{invoice.billingPeriod}</p> : null}</td><td className="px-5 py-4 font-semibold text-ink">{money(invoice.amount)}</td><td className="px-5 py-4 text-sub"><p>{money(invoice.paidAmount)} paid</p><p>{money(invoice.balanceAmount)} due</p></td><td className="px-5 py-4"><FinanceStatus status={invoice.status} /></td><td className="px-5 py-4">{invoice.status === 'pending' ? <button type="button" onClick={() => setPaymentInvoice(invoice)} className="flex h-9 items-center gap-2 rounded-md bg-[#66B159]/10 px-3 text-xs font-semibold text-[#66B159] hover:bg-[#66B159]/20"><CreditCard className="h-4 w-4" /> Record payment</button> : <span className="text-xs text-ghost">Complete</span>}</td></tr>)}</tbody></table></div>
    </section>

    <section className="surface rounded-lg"><div className="flex items-center justify-between gap-4 border-b border-zinc-800 p-6"><div><p className="text-lg font-semibold text-ink">Received payments</p><p className="mt-1 text-sm text-sub">Every income transaction recorded against an invoice.</p></div><button type="button" onClick={exportIncome} className="flex h-10 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white"><FileDown className="h-4 w-4" /> Export income</button></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-b border-zinc-700 text-left"><tr><th className="px-5 py-4 font-medium text-sub">Date</th><th className="px-5 py-4 font-medium text-sub">Invoice</th><th className="px-5 py-4 font-medium text-sub">Service</th><th className="px-5 py-4 font-medium text-sub">Method</th><th className="px-5 py-4 font-medium text-sub">Reference</th><th className="px-5 py-4 font-medium text-sub">Amount</th></tr></thead><tbody>{finance.payments.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-sub">No payments recorded yet.</td></tr> : finance.payments.map((payment) => <tr key={payment.id} className="border-b border-zinc-800 last:border-none"><td className="px-5 py-4 text-sub">{formatDateOnlyDisplay(payment.paymentDate)}</td><td className="px-5 py-4 font-medium text-ink">{payment.invoiceNumber}</td><td className="px-5 py-4 text-sub">{payment.service === 'ota_onboarding' ? 'OTA' : 'Revenue'}</td><td className="px-5 py-4 uppercase text-sub">{payment.method.replace('_', ' ')}</td><td className="px-5 py-4 text-sub">{payment.reference || '—'}</td><td className="px-5 py-4 font-semibold text-[#66B159]">{money(payment.amount)}</td></tr>)}</tbody></table></div></section>

    {paymentInvoice ? <RecordPaymentModal invoice={paymentInvoice} onClose={() => setPaymentInvoice(null)} onRecorded={() => { setPaymentInvoice(null); setMessage('Payment recorded successfully.'); void load() }} /> : null}
  </div>
}

function FinanceMetric({ label, value, detail, primary = false }: { label: string; value: string; detail: string; primary?: boolean }) {
  return <div className={`surface rounded-lg p-5 ${primary ? 'border-[#66B159]/40' : ''}`}><p className="text-xs font-semibold uppercase tracking-wider text-sub">{label}</p><p className={`mt-3 text-2xl font-bold ${primary ? 'text-[#66B159]' : 'text-ink'}`}>{value}</p><p className="mt-2 text-xs text-sub">{detail}</p></div>
}

function FinanceStatus({ status }: { status: FinanceInvoiceRecord['status'] }) {
  const styles = status === 'paid' ? 'border-green-500/25 bg-green-500/10 text-green-400' : status === 'cancelled' ? 'border-zinc-600 bg-zinc-800 text-sub' : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles}`}>{status}</span>
}
