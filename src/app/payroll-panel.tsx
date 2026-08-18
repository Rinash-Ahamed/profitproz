'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, CreditCard, FileDown, Loader2, RefreshCw, X } from 'lucide-react'
import { authenticatedFetch as fetch } from '@/lib/client-api'
import { ToastMessage } from '@/components/ui/ToastMessage'
import { useAppDialog } from '@/components/ui/AppDialogProvider'
import { calculatePayrollPeriodAmounts, currentPayrollMonth, nextPayrollStatus, parsePayrollMonth, PAYROLL_START_MONTH, payrollMonthDates, type MissingAttendanceDecision, type PayrollRecord, type PayrollStatus } from '@/lib/payroll'

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

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

function payrollDateLabel(value: string) {
  return value.split('-').reverse().join('-')
}

export function PayrollPanel() {
  const { confirmAction } = useAppDialog()
  const currentMonth = currentPayrollMonth()
  const minimumPickerMonth = shiftMonth(currentMonth, -3)
  const maximumPickerMonth = shiftMonth(currentMonth, 3)
  const [month, setMonth] = useState(currentMonth)
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [attendanceRecordId, setAttendanceRecordId] = useState('')

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
    if (!await confirmAction({ title: `${status === 'approved' ? 'Approve' : status === 'paid' ? 'Mark paid' : 'Confirm'} payroll?`, message: confirmation, confirmLabel: status === 'approved' ? 'Approve payroll' : status === 'paid' ? 'Mark as paid' : 'Confirm calculation', tone: status === 'paid' ? 'warning' : 'default' })) return
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

  async function decideAttendance(record: PayrollRecord, date: string, decision: MissingAttendanceDecision) {
    if (record.missingAttendanceDecisions[date]) return
    const displayDate = date.split('-').reverse().join('-')
    const confirmed = await confirmAction({
      title: decision === 'lop' ? 'Proceed with LOP?' : 'Ignore missing attendance?',
      message: decision === 'lop'
        ? `Proceed with LOP for ${record.employeeName} on ${displayDate}? You can revert this while payroll remains in Draft.`
        : `Ignore missing attendance for ${record.employeeName} on ${displayDate}? You can revert this while payroll remains in Draft.`,
      confirmLabel: decision === 'lop' ? 'Proceed to LOP' : 'Ignore attendance',
      tone: decision === 'lop' ? 'danger' : 'warning',
    })
    if (!confirmed) return

    const actionKey = `${record.id}:${date}`
    setActionId(actionKey)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/admin/payroll/${encodeURIComponent(record.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missingAttendanceDate: date, decision }),
      })
      const data = await response.json() as { payroll?: PayrollRecord; message?: string }
      if (!response.ok || !data.payroll) throw new Error(data.message || 'Unable to save the attendance decision.')
      setRecords((current) => current.map((item) => item.id === data.payroll!.id ? data.payroll! : item))
      setMessage(`${record.employeeName}'s ${displayDate} attendance was marked as ${decision === 'lop' ? 'LOP' : 'ignored'}.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save the attendance decision.')
    } finally {
      setActionId('')
    }
  }

  async function revertAttendance(record: PayrollRecord, date: string) {
    if (!record.missingAttendanceDecisions[date] || record.status !== 'draft') return
    const displayDate = date.split('-').reverse().join('-')
    const confirmed = await confirmAction({
      title: 'Revert attendance decision?',
      message: `Return ${record.employeeName}'s ${displayDate} attendance decision to Pending? Payroll values will be recalculated and this date must be reviewed again.`,
      confirmLabel: 'Revert decision',
      tone: 'warning',
    })
    if (!confirmed) return

    const actionKey = `${record.id}:${date}`
    setActionId(actionKey)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/admin/payroll/${encodeURIComponent(record.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missingAttendanceDate: date, action: 'revert_missing_attendance' }),
      })
      const data = await response.json() as { payroll?: PayrollRecord; message?: string }
      if (!response.ok || !data.payroll) throw new Error(data.message || 'Unable to revert the attendance decision.')
      setRecords((current) => current.map((item) => item.id === data.payroll!.id ? data.payroll! : item))
      setMessage(`${record.employeeName}'s ${displayDate} attendance decision was reverted to pending.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to revert the attendance decision.')
    } finally {
      setActionId('')
    }
  }

  function exportCsv() {
    if (!records.length) {
      setError('Generate payroll before exporting it.')
      return
    }
    const firstPeriod = calculatePayrollPeriodAmounts(records[0])
    const headings = ['Employee Name', 'Employee ID', ...(firstPeriod.isIncomplete ? ['Calculated Through'] : []), 'Calendar Days', 'Paid Sundays', 'Working Days', 'Days Present', 'CL Available', 'Casual Leave Used', 'Missing Attendance', 'LOP Days', 'Payable Working Days', 'Paid Salary Days', 'Gross Salary', 'LOP Deduction', firstPeriod.isIncomplete ? 'Salary Earned' : 'Net Salary', 'Status']
    const rows = records.map((record) => {
      const period = calculatePayrollPeriodAmounts(record)
      return [record.employeeName, record.employeeId, ...(firstPeriod.isIncomplete ? [payrollDateLabel(period.completedThroughDate)] : []), record.totalCalendarDays, record.sundayHolidays, record.totalWorkingDays, record.daysPresent, record.closingCasualLeaveBalance, record.casualLeaveUsed, record.missingAttendanceDays, period.lopDays, period.payableDays, period.paidSalaryDays, record.grossSalary, period.lopDeduction, period.netSalary, record.status].map(csvValue).join(',')
    })
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

  const payrollPeriods = records.map((record) => calculatePayrollPeriodAmounts(record))
  const displayedPeriod = payrollPeriods[0]
  const periodDateLabel = displayedPeriod?.isIncomplete ? payrollDateLabel(displayedPeriod.completedThroughDate) : ''
  const grossTotal = records.reduce((total, record) => total + record.grossSalary, 0)
  const deductionTotal = payrollPeriods.reduce((total, period) => total + period.lopDeduction, 0)
  const netTotal = payrollPeriods.reduce((total, period) => total + period.netSalary, 0)
  const selectedMonthDates = parsePayrollMonth(month) ? payrollMonthDates(month) : []
  const selectedMonthSundays = selectedMonthDates.filter((date) => new Date(`${date}T00:00:00Z`).getUTCDay() === 0).length
  const attendanceRecord = records.find((record) => record.id === attendanceRecordId)

  return (
    <div className="space-y-5">
      <ToastMessage message={error || message} tone={error ? 'error' : 'success'} onDismiss={() => { setError(''); setMessage('') }} />

      <div className="surface rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 p-6">
          <div>
            <p className="text-lg font-semibold text-ink">Payroll Processing</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="month" value={month} min={minimumPickerMonth} max={maximumPickerMonth} onChange={(event) => setMonth(event.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink" aria-label="Payroll month" />
            <span title="Salary and LOP rates use calendar days." className="flex h-10 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-sub">Calendar days: <strong className="ml-1 font-semibold text-ink">{selectedMonthDates.length}</strong></span>
            <span title="Sundays are paid holidays and do not require attendance." className="flex h-10 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-sub">Paid Sundays: <strong className="ml-1 font-semibold text-ink">{selectedMonthSundays}</strong></span>
            {displayedPeriod?.isIncomplete ? <span className="flex h-10 whitespace-nowrap items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-sub">Calculated through: <strong className="ml-1 font-semibold text-ink">{periodDateLabel}</strong></span> : null}
            <button type="button" onClick={() => void load()} disabled={loading} className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm text-sub hover:text-ink disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
            <button type="button" onClick={generate} disabled={!!actionId || !month || month < PAYROLL_START_MONTH || month > currentMonth} className="flex h-10 items-center gap-2 rounded-lg border border-[#66B159]/35 bg-[#66B159]/15 px-4 text-sm font-semibold text-[#66B159] transition-colors hover:bg-[#66B159]/25 disabled:opacity-50">{actionId === 'generate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Generate / Refresh Draft</button>
            <button type="button" onClick={exportCsv} disabled={!records.length} className="flex h-10 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#73bd66] disabled:opacity-50"><FileDown className="h-4 w-4" /> Export CSV</button>
          </div>
        </div>

        {records.length ? <div className="grid gap-px border-b border-zinc-800 bg-zinc-800 sm:grid-cols-3"><PayrollSummary label="Gross payroll" value={money(grossTotal)} /><PayrollSummary label="LOP deductions" value={money(deductionTotal)} /><PayrollSummary label={displayedPeriod?.isIncomplete ? 'Salary earned' : 'Net payroll'} value={money(netTotal)} /></div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1650px] text-sm">
            <thead className="border-b border-zinc-700 text-left"><tr><PayrollHeading sticky="left">Employee</PayrollHeading><PayrollHeading>Working Days</PayrollHeading><PayrollHeading>Days Present</PayrollHeading><PayrollHeading><span title="Casual leave remaining after approved leave usage.">CL Available</span></PayrollHeading><PayrollHeading>CL Used</PayrollHeading><PayrollHeading>Missing Attendance</PayrollHeading><PayrollHeading>LOP Days</PayrollHeading><PayrollHeading><span title="Working days payable after LOP and pending attendance reviews.">Payable Working Days</span></PayrollHeading><PayrollHeading><span title="Calendar salary days, including paid Sundays, after LOP and pending attendance reviews.">Paid Salary Days</span></PayrollHeading><PayrollHeading>Gross Salary</PayrollHeading><PayrollHeading>LOP Deduction</PayrollHeading><PayrollHeading>{displayedPeriod?.isIncomplete ? 'Salary Earned' : 'Net Salary'}</PayrollHeading><PayrollHeading>Status</PayrollHeading><PayrollHeading sticky="right">Action</PayrollHeading></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={14} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-sub" /></td></tr> : records.length === 0 ? <tr><td colSpan={14} className="py-12 text-center text-sub">No payroll records for {monthLabel(month)}.</td></tr> : records.map((record) => {
                const pendingAttendanceCount = record.missingAttendanceDates.filter((date) => !record.missingAttendanceDecisions[date]).length
                const attendanceReviewComplete = record.missingAttendanceDays > 0 && pendingAttendanceCount === 0
                const period = calculatePayrollPeriodAmounts(record)
                const finalizationBlocked = period.isIncomplete && (record.status === 'calculated' || record.status === 'approved')
                return <tr key={record.id} className="border-b border-zinc-800 last:border-none">
                  <td className="sticky left-0 z-10 border-r border-zinc-800 bg-[#16181a] px-4 py-4"><p className="font-medium text-ink">{record.employeeName}</p><p className="mt-1 text-xs text-sub">{record.employeeId}</p></td>
                  <PayrollNumber>{record.totalWorkingDays}</PayrollNumber><PayrollNumber>{record.daysPresent}</PayrollNumber><PayrollNumber>{record.closingCasualLeaveBalance}</PayrollNumber><PayrollNumber>{record.casualLeaveUsed}</PayrollNumber><td className="px-4 py-4">{record.missingAttendanceDays ? <button type="button" onClick={() => setAttendanceRecordId(record.id)} className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${attendanceReviewComplete ? 'border-green-500/25 bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'border-amber-500/25 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'}`}>{attendanceReviewComplete ? <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Reviewed {record.missingAttendanceDays}/{record.missingAttendanceDays}</span> : `Review ${pendingAttendanceCount}/${record.missingAttendanceDays}`}</button> : <span className="text-sub">0</span>}</td><PayrollNumber>{period.lopDays}</PayrollNumber><PayrollNumber>{period.payableDays}</PayrollNumber><PayrollNumber>{period.paidSalaryDays}</PayrollNumber><PayrollNumber>{money(record.grossSalary)}</PayrollNumber><PayrollNumber>{money(period.lopDeduction)}</PayrollNumber><td className="px-4 py-4 font-semibold text-ink">{money(period.netSalary)}</td>
                  <td className="px-4 py-4"><PayrollStatusBadge status={record.status} /></td>
                  <td className="sticky right-0 z-10 border-l border-zinc-800 bg-[#16181a] px-4 py-4">{nextPayrollStatus(record.status) ? <button type="button" onClick={() => advance(record)} disabled={!!actionId || finalizationBlocked || (record.status === 'draft' && record.missingAttendanceDates.some((date) => !record.missingAttendanceDecisions[date]))} title={finalizationBlocked ? 'Approval is available after the complete month has been calculated.' : record.status === 'draft' && record.missingAttendanceDates.some((date) => !record.missingAttendanceDecisions[date]) ? 'Review every missing-attendance date first.' : undefined} className="flex h-9 items-center gap-2 rounded-md bg-[#66B159]/10 px-3 text-xs font-semibold text-[#66B159] hover:bg-[#66B159]/20 disabled:opacity-50">{actionId === record.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : record.status === 'approved' ? <CreditCard className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{record.status === 'draft' ? 'Confirm Calculation' : record.status === 'calculated' ? 'Approve' : 'Mark paid'}</button> : <span className="text-xs text-green-400">Complete</span>}</td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </div>

      {attendanceRecord ? <MissingAttendanceModal record={attendanceRecord} actionId={actionId} onDecide={decideAttendance} onRevert={revertAttendance} onClose={() => setAttendanceRecordId('')} /> : null}
    </div>
  )
}

function MissingAttendanceModal({ record, actionId, onDecide, onRevert, onClose }: { record: PayrollRecord; actionId: string; onDecide: (record: PayrollRecord, date: string, decision: MissingAttendanceDecision) => Promise<void>; onRevert: (record: PayrollRecord, date: string) => Promise<void>; onClose: () => void }) {
  return <div className="pwa-safe-modal fixed inset-0 z-[240] flex items-start justify-center overflow-y-auto bg-black/70 sm:items-center" role="dialog" aria-modal="true" aria-label="Review missing attendance">
    <div className="surface max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-700 shadow-2xl">
      <div className="flex items-start justify-between border-b border-zinc-800 p-5"><div><p className="font-semibold text-ink">Missing attendance · {record.employeeName}</p><p className="mt-1 text-xs text-sub">Decisions are available while this payroll is in Draft.</p></div><button type="button" onClick={onClose} className="rounded-md p-1.5 text-sub hover:bg-zinc-800 hover:text-ink" aria-label="Close"><X className="h-4 w-4" /></button></div>
      <div className="max-h-[65vh] space-y-2 overflow-y-auto p-5">
        {record.missingAttendanceDates.map((date) => {
          const decision = record.missingAttendanceDecisions[date]
          const busy = actionId === `${record.id}:${date}`
          return <div key={date} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
            <div className="flex items-center gap-2">{decision ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <AlertTriangle className="h-4 w-4 text-amber-300" />}<span className="text-sm font-medium text-ink">{date.split('-').reverse().join('-')}</span>{decision ? <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${decision === 'lop' ? 'bg-red-500/10 text-red-300' : 'bg-zinc-800 text-sub'}`}>{decision === 'lop' ? 'LOP' : 'Ignored'}</span> : <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-300">Pending</span>}</div>
            {decision ? <div className="flex items-center gap-2"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400"><CheckCircle2 className="h-3.5 w-3.5" />Reviewed</span><button type="button" onClick={() => void onRevert(record, date)} disabled={!!actionId || record.status !== 'draft'} className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Revert'}</button></div> : <div className="flex gap-2"><button type="button" onClick={() => void onDecide(record, date, 'lop')} disabled={!!actionId || record.status !== 'draft'} className="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Proceed to LOP'}</button><button type="button" onClick={() => void onDecide(record, date, 'ignored')} disabled={!!actionId || record.status !== 'draft'} className="rounded-md bg-[#66B159]/10 px-3 py-2 text-xs font-semibold text-[#66B159] hover:bg-[#66B159]/20 disabled:opacity-50">Ignore</button></div>}
          </div>
        })}
      </div>
    </div>
  </div>
}

function PayrollHeading({ children, sticky }: { children: ReactNode; sticky?: 'left' | 'right' }) { return <th className={`px-4 py-4 font-medium text-sub ${sticky === 'left' ? 'sticky left-0 z-20 border-r border-zinc-700 bg-[#1c1e20]' : sticky === 'right' ? 'sticky right-0 z-20 border-l border-zinc-700 bg-[#1c1e20]' : ''}`}>{children}</th> }
function PayrollNumber({ children }: { children: ReactNode }) { return <td className="px-4 py-4 text-sub">{children}</td> }
function PayrollSummary({ label, value }: { label: string; value: string }) { return <div className="bg-zinc-950/60 p-5"><p className="text-xs uppercase tracking-wide text-ghost">{label}</p><p className="mt-2 text-xl font-semibold text-ink">{value}</p></div> }
function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  const style = status === 'paid' ? 'border-green-500/25 bg-green-500/10 text-green-400' : status === 'approved' ? 'border-blue-500/25 bg-blue-500/10 text-blue-300' : status === 'calculated' ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-zinc-600 bg-zinc-800 text-sub'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${style}`}>{status}</span>
}
