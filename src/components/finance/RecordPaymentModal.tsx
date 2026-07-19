'use client'

import { FormEvent, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import type { FinanceInvoiceRecord, PaymentMethod } from '@/lib/finance'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { authenticatedFetch as fetch } from '@/lib/client-api'
import { todayLocalDateOnly } from '@/lib/date-only'

export function RecordPaymentModal({ invoice, onClose, onRecorded }: { invoice: FinanceInvoiceRecord; onClose: () => void; onRecorded: (invoice: FinanceInvoiceRecord) => void }) {
  const [paymentDate, setPaymentDate] = useState(todayLocalDateOnly())
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputClass = 'h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      const response = await fetch(`/api/admin/finance/invoices/${encodeURIComponent(invoice.id)}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: invoice.balanceAmount, paymentDate, method, reference, notes }),
      })
      const data = await response.json() as { invoice?: FinanceInvoiceRecord; message?: string }
      if (!response.ok || !data.invoice) throw new Error(data.message || 'Failed to record payment.')
      onRecorded(data.invoice)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to record payment.')
    } finally { setSaving(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <form onSubmit={submit} className="surface w-full max-w-xl rounded-xl p-6 shadow-2xl sm:p-7">
        <div><p className="text-lg font-semibold text-ink">Record payment</p><p className="mt-1 text-sm text-sub">{invoice.invoiceNumber} · {invoice.propertyName}</p></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label><span className="label-upper mb-2 block text-ghost">Full payment amount</span><input type="text" value={`₹${invoice.balanceAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} className={`${inputClass} cursor-not-allowed opacity-80`} readOnly /><span className="mt-1 block text-xs text-sub">The invoice will be marked paid after saving.</span></label>
          <label><span className="label-upper mb-2 block text-ghost">Payment date</span><DatePickerInput value={paymentDate} onChange={setPaymentDate} className={inputClass} required /></label>
          <label><span className="label-upper mb-2 block text-ghost">Payment method</span><select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className={inputClass}><option value="upi">UPI</option><option value="neft">NEFT</option><option value="rtgs">RTGS</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></label>
          <label><span className="label-upper mb-2 block text-ghost">Reference number (optional)</span><input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={160} className={inputClass} /></label>
        </div>
        <label className="mt-4 block"><span className="label-upper mb-2 block text-ghost">Notes (optional)</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} className={`${inputClass} h-auto resize-y py-3`} /></label>
        {error ? <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="h-11 rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-sub hover:text-ink">Cancel</button><button type="submit" disabled={saving} className="flex h-11 items-center gap-2 rounded-lg bg-[#66B159] px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save payment</button></div>
      </form>
    </div>, document.body,
  )
}
