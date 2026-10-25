import type { ExpenseRecord } from '@/lib/firestore'

export function ExpensePaymentDate({ expense }: { expense: Pick<ExpenseRecord, 'paymentStatus' | 'paidAt'> }) {
  if (expense.paymentStatus !== 'paid') return null
  const paidAt = expense.paidAt ? new Date(expense.paidAt) : null
  if (!paidAt || !Number.isFinite(paidAt.getTime())) {
    return <p className="mt-1 text-xs text-sub">Payment date not recorded</p>
  }
  return <p className="mt-1 text-xs text-sub">
    Paid on: <time dateTime={expense.paidAt}>{paidAt.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })} IST</time>
  </p>
}
