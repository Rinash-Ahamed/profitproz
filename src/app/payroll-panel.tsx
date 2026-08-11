'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { CheckCircle2, CreditCard, FileDown, Loader2, RefreshCw } from 'lucide-react'
import { authenticatedFetch as fetch } from '@/lib/client-api'
import { currentPayrollMonth, nextPayrollStatus, parsePayrollMonth, PAYROLL_START_MONTH, payrollMonthDates, type PayrollRecord, type PayrollStatus } from '@/lib/payroll'

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value)

function monthLabel(month: string) {
  const parsed = parsePayrollMonth(month)
  if (!parsed) return 'selected month'
  return new Date(parsed.year, parsed.month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function shiftMonth(month: string, offset: number) {
  const parsed = parsePayrollMonth(month)
  if (!parsed) return month
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function csvValue(value: unknown) {
  const text = String(value ?? '')
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export function PayrollPanel() {
  const currentMonth = currentPayrollMonth()
  const minimumPickerMonth = shiftMonth(currentMonth, -3)
  const maximumPickerMonth = shiftMonth(currentMonth, 3)
  const [month, setMonth] = useState(currentMonth)
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/payroll?month=${encodeURIComponent(month)}`, { signal })
      const data = await response.json() as { payroll?: PayrollRecord[]; message?: string }
      if (!response.ok || !data.payroll) throw new Error(data.message || 'Unable to load payroll records.')
      setRecords(data.payroll)
    } catch (caught) {
      if (caught instanceof Error && caught.name === 'AbortError') return
      setError(caught instanceof Error ? caught.message : 'Unable to load payroll records.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [month])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function generate() {
    setActionId('generate')
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      })
      const data = await response.json() as { payroll?: PayrollRecord[]; message?: string }
      if (!response.ok || !data.payroll) throw new Error(data.message || 'Unable to generate payroll.')
      setRecords(data.payroll)
      setMessage(`${monthLabel(month)} payroll snapshots are ready for review.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to generate payroll.')
    } finally {
      setActionId('')
    }
  }

  async function advance(record: PayrollRecord) {
    const status = nextPayrollStatus(record.status)
    if (!status) return
    const confirmation = status === 'approved'
      ? `Approve ${record.employeeName}'s ${monthLabel(record.month)} payroll? The saved snapshot will remain unchanged.`
      : status === 'paid'
        ? `Mark ${record.employeeName}'s payroll as paid?`
        : `Confirm the calculated payroll for ${record.employeeName}?`
    if (!window.confirm(confirmation)) return
    setActionId(record.id)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/admin/payroll/${encodeURIComponent(record.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json() as { payroll?: PayrollRecord; message?: string }
      if (!response.ok || !data.payroll) throw new Error(data.message || 'Unable to update payroll status.')
      setRecords((current) => current.map((item) => item.id === data.payroll!.id ? data.payroll! : item))
      setMessage(`${record.employeeName}'s payroll is now ${status}.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update payroll status.')
    } finally {
      setActionId('')
    }
  }

  function exportCsv() {
    if (!records.length) {
      setError('Generate payroll before exporting it.')
      return
    }
    const headings = ['Employee Name', 'Employee ID', 'Calendar Days', 'Sundays', 'Working Days', 'Days Present', 'CL Available', 'Casual Leave Used', 'Closing CL Balance', 'LOP Days', 'Payable Days', 'Gross Salary', 'LOP Deduction', 'Net Salary', 'Status']
    const rows = records.map((record) => [record.employeeName, record.employeeId, record.totalCalendarDays, record.sundayHolidays, record.totalWorkingDays, record.daysPresent, record.casualLeaveAvailable, record.casualLeaveUsed, record.closingCasualLeaveBalance, record.lopDays, record.payableDays, record.grossSalary, record.lopDeduction, record.netSalary, record.status].map(csvValue).join(','))
    const csv = ['sep=,', headings.map(csvValue).join(','), ...rows].join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `payroll-${month}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const grossTotal = records.reduce((total, record) => total + record.grossSalary, 0)
  const deductionTotal = records.reduce((total, record) => total + record.lopDeduction, 0)
  const netTotal = records.reduce((total, record) => total + record.netSalary, 0)
  const selectedMonthDates = parsePayrollMonth(month) ? payrollMonthDates(month) : []
  const selectedMonthSundays = selectedMonthDates.filter((date) => new Date(`${date}T00:00:00Z`).getUTCDay() === 0).length

  return (
    <div className="space-y-5">
      {message ? <p className="rounded-lg border border-[#66B159]/30 bg-[#66B159]/10 px-4 py-3 text-sm text-ink">{message}</p> : null}
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <div className="surface rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 p-6">
          <div>
            <p className="text-lg font-semibold text-ink">Payroll Processing</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="month" value={month} min={minimumPickerMonth} max={maximumPickerMonth} onChange={(event) => setMonth(event.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink" aria-label="Payroll month" />
            <span className="flex h-10 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-sub">Calendar days: <strong className="ml-1 font-semibold text-ink">{selectedMonthDates.length}</strong></span>
            <span className="flex h-10 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-sub">Sundays: <strong className="ml-1 font-semibold text-ink">{selectedMonthSundays}</strong></span>
            <button type="button" onClick={() => void load()} disabled={loading} className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm text-sub hover:text-ink disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
            <button type="button" onClick={generate} disabled={!!actionId || !month || month < PAYROLL_START_MONTH || month > currentMonth} className="flex h-10 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:opacity-50">{actionId === 'generate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Generate / Refresh Draft</button>
            <button type="button" onClick={exportCsv} disabled={!records.length} className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-sub hover:text-ink disabled:opacity-50"><FileDown className="h-4 w-4" /> Export CSV</button>
          </div>
        </div>

        {records.length ? <div className="grid gap-px border-b border-zinc-800 bg-zinc-800 sm:grid-cols-[auto_repeat(3,minmax(0,1fr))]"><div className="flex items-center bg-zinc-950/60 px-5 py-4 text-sm font-semibold text-ink">Overall</div><PayrollSummary label="Gross payroll" value={money(grossTotal)} /><PayrollSummary label="LOP deductions" value={money(deductionTotal)} /><PayrollSummary label="Net payroll" value={money(netTotal)} /></div> : null}
        {records.length ? <p className="border-b border-zinc-800 px-6 py-3 text-xs text-sub">Attendance, leave, and LOP assessed through {records[0].calculationThroughDate.split('-').reverse().join('-')}. Future dates in an incomplete month are not treated as LOP.</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-sm">
            <thead className="border-b border-zinc-700 text-left"><tr><PayrollHeading>Employee</PayrollHeading><PayrollHeading>Working Days</PayrollHeading><PayrollHeading>Days Present</PayrollHeading><PayrollHeading>CL Available</PayrollHeading><PayrollHeading>CL Used</PayrollHeading><PayrollHeading>CL Balance</PayrollHeading><PayrollHeading>LOP Days</PayrollHeading><PayrollHeading>Payable Days</PayrollHeading><PayrollHeading>Gross Salary</PayrollHeading><PayrollHeading>LOP Deduction</PayrollHeading><PayrollHeading>Net Salary</PayrollHeading><PayrollHeading>Status</PayrollHeading><PayrollHeading>Action</PayrollHeading></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={13} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-sub" /></td></tr> : records.length === 0 ? <tr><td colSpan={13} className="py-12 text-center text-sub">No payroll records for {monthLabel(month)}.</td></tr> : records.map((record) => (
                <tr key={record.id} className="border-b border-zinc-800 last:border-none">
                  <td className="px-4 py-4"><p className="font-medium text-ink">{record.employeeName}</p><p className="mt-1 text-xs text-sub">{record.employeeId}</p></td>
                  <PayrollNumber>{record.totalWorkingDays}</PayrollNumber><PayrollNumber>{record.daysPresent}</PayrollNumber><PayrollNumber>{record.casualLeaveAvailable}</PayrollNumber><PayrollNumber>{record.casualLeaveUsed}</PayrollNumber><PayrollNumber>{record.closingCasualLeaveBalance}</PayrollNumber><PayrollNumber>{record.lopDays}</PayrollNumber><PayrollNumber>{record.payableDays}</PayrollNumber><PayrollNumber>{money(record.grossSalary)}</PayrollNumber><PayrollNumber>{money(record.lopDeduction)}</PayrollNumber><td className="px-4 py-4 font-semibold text-ink">{money(record.netSalary)}</td>
                  <td className="px-4 py-4"><PayrollStatusBadge status={record.status} /></td>
                  <td className="px-4 py-4">{nextPayrollStatus(record.status) ? <button type="button" onClick={() => advance(record)} disabled={!!actionId} className="flex h-9 items-center gap-2 rounded-md bg-[#66B159]/10 px-3 text-xs font-semibold text-[#66B159] hover:bg-[#66B159]/20 disabled:opacity-50">{actionId === record.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : record.status === 'approved' ? <CreditCard className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{record.status === 'draft' ? 'Confirm calculation' : record.status === 'calculated' ? 'Approve' : 'Mark paid'}</button> : <span className="text-xs text-green-400">Complete</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function PayrollHeading({ children }: { children: ReactNode }) { return <th className="px-4 py-4 font-medium text-sub">{children}</th> }
function PayrollNumber({ children }: { children: ReactNode }) { return <td className="px-4 py-4 text-sub">{children}</td> }
function PayrollSummary({ label, value }: { label: string; value: string }) { return <div className="bg-zinc-950/60 p-5"><p className="text-xs uppercase tracking-wide text-ghost">{label}</p><p className="mt-2 text-xl font-semibold text-ink">{value}</p></div> }
function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  const style = status === 'paid' ? 'border-green-500/25 bg-green-500/10 text-green-400' : status === 'approved' ? 'border-blue-500/25 bg-blue-500/10 text-blue-300' : status === 'calculated' ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-zinc-600 bg-zinc-800 text-sub'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${style}`}>{status}</span>
}
