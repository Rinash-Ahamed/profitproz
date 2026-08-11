import { parseDateOnly } from './date-only'

export const PAYROLL_STATUSES = ['draft', 'calculated', 'approved', 'paid'] as const

export type PayrollStatus = (typeof PAYROLL_STATUSES)[number]

export type PayrollStatusHistoryEntry = {
  from: PayrollStatus | null
  to: PayrollStatus
  actorEmail: string
  at: string
}

export type PayrollRecord = {
  id: string
  month: string
  employeeId: string
  staffId: string
  employeeName: string
  staffEmail: string
  designation: string
  department: string
  monthlySalary: number
  annualCtc: number
  totalCalendarDays: number
  sundayHolidays: number
  totalWorkingDays: number
  daysPresent: number
  casualLeaveUsed: number
  lopDays: number
  payableDays: number
  grossSalary: number
  lopDeduction: number
  netSalary: number
  attendanceDates: string[]
  approvedLeaveDates: string[]
  approvedLeaveIds: string[]
  status: PayrollStatus
  snapshotVersion: 1
  statusHistory: PayrollStatusHistoryEntry[]
  generatedAt: string
  generatedBy: string
  calculatedAt?: string
  approvedAt?: string
  approvedBy?: string
  paidAt?: string
  paidBy?: string
  updatedAt?: string
}

export type PayrollCalculationInput = {
  month: string
  monthlySalary: number
  completedWorkDates: Iterable<string>
  approvedLeaves: Array<{ id: string; startDate: string; endDate: string }>
}

export type PayrollCalculation = Pick<PayrollRecord,
  | 'totalCalendarDays'
  | 'sundayHolidays'
  | 'totalWorkingDays'
  | 'daysPresent'
  | 'casualLeaveUsed'
  | 'lopDays'
  | 'payableDays'
  | 'grossSalary'
  | 'lopDeduction'
  | 'netSalary'
  | 'attendanceDates'
  | 'approvedLeaveDates'
  | 'approvedLeaveIds'
>

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function parsePayrollMonth(value: string) {
  const match = MONTH_PATTERN.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (year < 2000 || year > 2200 || month < 1 || month > 12) return null
  return { year, month }
}

export function currentPayrollMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value || ''
  const month = parts.find((part) => part.type === 'month')?.value || ''
  return `${year}-${month}`
}

export function previousPayrollMonth(date = new Date()) {
  const current = parsePayrollMonth(currentPayrollMonth(date))!
  const month = current.month === 1 ? 12 : current.month - 1
  const year = current.month === 1 ? current.year - 1 : current.year
  return `${year}-${String(month).padStart(2, '0')}`
}

export function isCompletedPayrollMonth(month: string, date = new Date()) {
  return !!parsePayrollMonth(month) && month < currentPayrollMonth(date)
}

export function payrollMonthDates(month: string) {
  const parsed = parsePayrollMonth(month)
  if (!parsed) throw new Error('INVALID_PAYROLL_MONTH')
  const totalCalendarDays = new Date(Date.UTC(parsed.year, parsed.month, 0)).getUTCDate()
  return Array.from({ length: totalCalendarDays }, (_, index) => {
    const day = String(index + 1).padStart(2, '0')
    return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${day}`
  })
}

function datesWithinMonth(startDate: string, endDate: string, month: string) {
  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)
  if (!start || !end || end < start) return []
  const results: string[] = []
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const value = date.toISOString().slice(0, 10)
    if (value.startsWith(`${month}-`)) results.push(value)
  }
  return results
}

export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculation {
  const calendarDates = payrollMonthDates(input.month)
  const workingDates = calendarDates.filter((date) => parseDateOnly(date)?.getUTCDay() !== 0)
  const workingDateSet = new Set(workingDates)
  const attendanceDates = [...new Set(input.completedWorkDates)]
    .filter((date) => workingDateSet.has(date))
    .sort()
  const attendanceDateSet = new Set(attendanceDates)

  const approvedLeaveIds = new Set<string>()
  const approvedLeaveDateSet = new Set<string>()
  for (const leave of input.approvedLeaves) {
    const dates = datesWithinMonth(leave.startDate, leave.endDate, input.month)
      .filter((date) => workingDateSet.has(date) && !attendanceDateSet.has(date))
    if (dates.length) approvedLeaveIds.add(leave.id)
    dates.forEach((date) => approvedLeaveDateSet.add(date))
  }
  const approvedLeaveDates = [...approvedLeaveDateSet].sort()
  const casualLeaveUsed = Math.min(1, approvedLeaveDates.length)
  const absentDates = workingDates.filter((date) => !attendanceDateSet.has(date))
  const lopDays = Math.max(0, absentDates.length - casualLeaveUsed)
  const totalWorkingDays = workingDates.length
  const monthlySalary = Math.max(0, input.monthlySalary)
  const grossSalary = roundMoney(monthlySalary)
  const lopDeduction = totalWorkingDays ? roundMoney((grossSalary / totalWorkingDays) * lopDays) : 0

  return {
    totalCalendarDays: calendarDates.length,
    sundayHolidays: calendarDates.length - totalWorkingDays,
    totalWorkingDays,
    daysPresent: attendanceDates.length,
    casualLeaveUsed,
    lopDays,
    payableDays: totalWorkingDays - lopDays,
    grossSalary,
    lopDeduction,
    netSalary: roundMoney(Math.max(0, grossSalary - lopDeduction)),
    attendanceDates,
    approvedLeaveDates,
    approvedLeaveIds: [...approvedLeaveIds].sort(),
  }
}

export function nextPayrollStatus(status: PayrollStatus): PayrollStatus | null {
  if (status === 'draft') return 'calculated'
  if (status === 'calculated') return 'approved'
  if (status === 'approved') return 'paid'
  return null
}
