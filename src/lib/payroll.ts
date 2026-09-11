import { parseDateOnly } from './date-only'

export const PAYROLL_STATUSES = ['draft', 'calculated', 'approved', 'paid'] as const
export const PAYROLL_START_MONTH = '2026-08'

export type PayrollStatus = (typeof PAYROLL_STATUSES)[number]
export type MissingAttendanceDecision = 'lop' | 'ignored'

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
  /** Current profile ID for display only; never persisted in payroll snapshots. */
  currentEmployeeId?: string
  staffId: string
  employeeName: string
  staffEmail: string
  designation: string
  department: string
  monthlySalary: number
  annualCtc: number
  employmentStartDate?: string
  totalCalendarDays: number
  sundayHolidays: number
  totalWorkingDays: number
  daysPresent: number
  openingCasualLeaveBalance: number
  casualLeaveEntitlement: number
  casualLeaveAvailable: number
  casualLeaveUsed: number
  closingCasualLeaveBalance: number
  missingAttendanceDays: number
  missingAttendanceDates: string[]
  missingAttendanceUnits: Record<string, number>
  missingAttendanceDecisions: Record<string, MissingAttendanceDecision>
  missingAttendanceLopDays: number
  lopDays: number
  payableDays: number
  grossSalary: number
  lopDeduction: number
  netSalary: number
  attendanceDates: string[]
  approvedLeaveDates: string[]
  approvedLeaveIds: string[]
  approvedLeaveUnits: Record<string, number>
  approvedLeaveLopUnits: Record<string, number>
  status: PayrollStatus
  snapshotVersion: 1
  statusHistory: PayrollStatusHistoryEntry[]
  calculationThroughDate: string
  completedThroughDate: string
  generatedAt: string
  generatedBy: string
  calculatedAt?: string
  approvedAt?: string
  approvedBy?: string
  paidAt?: string
  paidBy?: string
  refreshedAt?: string
  updatedAt?: string
}

export type PayrollCalculationInput = {
  month: string
  monthlySalary: number
  employmentStartDate?: string
  openingCasualLeaveBalance?: number
  calculationThroughDate?: string
  missingAttendanceThroughDate?: string
  completedWorkDates: Iterable<string>
  approvedLeaves: Array<{ id: string; startDate: string; endDate: string; durationType?: 'full_day' | 'half_day'; payrollTreatment?: 'auto' | 'cl' | 'lop' }>
  missingAttendanceDecisions?: Record<string, MissingAttendanceDecision>
}

export type PayrollCalculation = Pick<PayrollRecord,
  | 'totalCalendarDays'
  | 'sundayHolidays'
  | 'totalWorkingDays'
  | 'daysPresent'
  | 'openingCasualLeaveBalance'
  | 'casualLeaveEntitlement'
  | 'casualLeaveAvailable'
  | 'casualLeaveUsed'
  | 'closingCasualLeaveBalance'
  | 'missingAttendanceDays'
  | 'missingAttendanceDates'
  | 'missingAttendanceUnits'
  | 'missingAttendanceDecisions'
  | 'missingAttendanceLopDays'
  | 'lopDays'
  | 'payableDays'
  | 'grossSalary'
  | 'lopDeduction'
  | 'netSalary'
  | 'attendanceDates'
  | 'approvedLeaveDates'
  | 'approvedLeaveIds'
  | 'approvedLeaveUnits'
  | 'approvedLeaveLopUnits'
>

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/

function roundMoney(value: number) {
  return Math.round(value + Number.EPSILON)
}

export type PayrollPeriodAmounts = {
  isIncomplete: boolean
  completedThroughDate: string
  completedWorkingDays: number
  payableDays: number
  paidSalaryDays: number
  lopDays: number
  lopDeduction: number
  netSalary: number
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

export function isPayrollMonthAvailable(month: string, date = new Date()) {
  return !!parsePayrollMonth(month) && month >= PAYROLL_START_MONTH && month <= currentPayrollMonth(date)
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

export function payrollMonthEndDate(month: string) {
  return payrollMonthDates(month).at(-1)!
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
  const employmentStartDate = parseDateOnly(input.employmentStartDate || '') ? input.employmentStartDate! : calendarDates[0]
  const eligibleCalendarDates = calendarDates.filter((date) => date >= employmentStartDate)
  const workingDates = eligibleCalendarDates.filter((date) => parseDateOnly(date)?.getUTCDay() !== 0)
  const calculationThroughDate = input.calculationThroughDate && input.calculationThroughDate.startsWith(`${input.month}-`)
    ? input.calculationThroughDate
    : calendarDates.at(-1)!
  const assessedWorkingDates = workingDates.filter((date) => date <= calculationThroughDate)
  const missingAttendanceThroughDate = input.missingAttendanceThroughDate && input.missingAttendanceThroughDate < calculationThroughDate
    ? input.missingAttendanceThroughDate
    : calculationThroughDate
  const assessedMissingAttendanceDates = assessedWorkingDates.filter((date) => date <= missingAttendanceThroughDate)
  const workingDateSet = new Set(workingDates)
  const attendanceDates = [...new Set(input.completedWorkDates)]
    .filter((date) => workingDateSet.has(date) && date <= calculationThroughDate)
    .sort()
  const attendanceDateSet = new Set(attendanceDates)

  const approvedLeaveIds = new Set<string>()
  const leaveByDate = new Map<string, { unit: number; directLop: number; clCandidate: number }>()
  for (const leave of input.approvedLeaves) {
    const dates = datesWithinMonth(leave.startDate, leave.endDate, input.month)
      .filter((date) => workingDateSet.has(date) && date <= calculationThroughDate)
    const isHalfDay = leave.durationType === 'half_day' && leave.startDate === leave.endDate
    const unit = isHalfDay ? 0.5 : 1
    const applicableDates = dates.filter((date) => isHalfDay || !attendanceDateSet.has(date))
    if (applicableDates.length) approvedLeaveIds.add(leave.id)
    applicableDates.forEach((date) => {
      const current = leaveByDate.get(date) || { unit: 0, directLop: 0, clCandidate: 0 }
      const availableUnit = Math.max(0, 1 - current.unit)
      const appliedUnit = Math.min(unit, availableUnit)
      if (!appliedUnit) return
      current.unit += appliedUnit
      if (isHalfDay && leave.payrollTreatment === 'lop') current.directLop += appliedUnit
      else current.clCandidate += appliedUnit
      leaveByDate.set(date, current)
    })
  }
  const approvedLeaveDates = [...leaveByDate.keys()].sort()
  const openingCasualLeaveBalance = Math.max(0, Number(input.openingCasualLeaveBalance || 0))
  const casualLeaveEntitlement = 1
  const casualLeaveAvailable = openingCasualLeaveBalance + casualLeaveEntitlement
  let remainingCasualLeave = casualLeaveAvailable
  const approvedLeaveUnits: Record<string, number> = {}
  const approvedLeaveLopUnits: Record<string, number> = {}
  let casualLeaveUsed = 0
  approvedLeaveDates.forEach((date) => {
    const leave = leaveByDate.get(date)!
    const clUsed = Math.min(remainingCasualLeave, leave.clCandidate)
    remainingCasualLeave -= clUsed
    casualLeaveUsed += clUsed
    approvedLeaveUnits[date] = leave.unit
    approvedLeaveLopUnits[date] = leave.directLop + (leave.clCandidate - clUsed)
  })
  const closingCasualLeaveBalance = casualLeaveAvailable - casualLeaveUsed
  const missingAttendanceUnits = Object.fromEntries(assessedMissingAttendanceDates.flatMap((date) => {
    const leaveUnit = approvedLeaveUnits[date] || 0
    const presentUnit = attendanceDateSet.has(date) ? Math.max(0, 1 - leaveUnit) : 0
    const missingUnit = Math.max(0, 1 - presentUnit - leaveUnit)
    return missingUnit > 0 ? [[date, missingUnit]] : []
  })) as Record<string, number>
  const missingAttendanceDates = Object.keys(missingAttendanceUnits).sort()
  const missingDateSet = new Set(missingAttendanceDates)
  const missingAttendanceDecisions = Object.fromEntries(
    Object.entries(input.missingAttendanceDecisions || {})
      .filter(([date, decision]) => missingDateSet.has(date) && (decision === 'lop' || decision === 'ignored')),
  ) as Record<string, MissingAttendanceDecision>
  const missingAttendanceLopDays = Object.entries(missingAttendanceDecisions).reduce((total, [date, decision]) => total + (decision === 'lop' ? missingAttendanceUnits[date] || 0 : 0), 0)
  const approvedLeaveLopDays = Object.values(approvedLeaveLopUnits).reduce((total, unit) => total + unit, 0)
  const lopDays = approvedLeaveLopDays + missingAttendanceLopDays
  const totalWorkingDays = workingDates.length
  const monthlySalary = Math.max(0, input.monthlySalary)
  const totalCalendarDays = calendarDates.length
  const dailySalary = totalCalendarDays ? monthlySalary / totalCalendarDays : 0
  const grossSalary = roundMoney(dailySalary * eligibleCalendarDates.length)
  const lopDeduction = roundMoney(dailySalary * lopDays)

  return {
    totalCalendarDays,
    sundayHolidays: eligibleCalendarDates.length - totalWorkingDays,
    totalWorkingDays,
    daysPresent: attendanceDates.reduce((total, date) => total + Math.max(0, 1 - (approvedLeaveUnits[date] || 0)), 0),
    openingCasualLeaveBalance,
    casualLeaveEntitlement,
    casualLeaveAvailable,
    casualLeaveUsed,
    closingCasualLeaveBalance,
    missingAttendanceDays: Object.values(missingAttendanceUnits).reduce((total, unit) => total + unit, 0),
    missingAttendanceDates,
    missingAttendanceUnits,
    missingAttendanceDecisions,
    missingAttendanceLopDays,
    lopDays,
    payableDays: totalWorkingDays - lopDays,
    grossSalary,
    lopDeduction,
    netSalary: roundMoney(Math.max(0, grossSalary - lopDeduction)),
    attendanceDates,
    approvedLeaveDates,
    approvedLeaveIds: [...approvedLeaveIds].sort(),
    approvedLeaveUnits,
    approvedLeaveLopUnits,
  }
}

export function calculatePayrollPeriodAmounts(record: PayrollRecord): PayrollPeriodAmounts {
  const monthEndDate = payrollMonthEndDate(record.month)
  const completedThroughDate = record.completedThroughDate && record.completedThroughDate < monthEndDate
    ? record.completedThroughDate
    : monthEndDate
  const isIncomplete = completedThroughDate < monthEndDate
  const employmentStartDate = parseDateOnly(record.employmentStartDate || '') ? record.employmentStartDate! : `${record.month}-01`
  const eligibleCalendarDates = payrollMonthDates(record.month).filter((date) => date >= employmentStartDate)
  const dailySalary = record.totalCalendarDays ? record.monthlySalary / record.totalCalendarDays : 0

  if (!isIncomplete) {
    const pendingMissingAttendanceDays = record.missingAttendanceDates
      .filter((date) => !record.missingAttendanceDecisions[date])
      .reduce((total, date) => total + (record.missingAttendanceUnits[date] || 1), 0)
    const paidSalaryDays = Math.max(0, eligibleCalendarDates.length - record.lopDays - pendingMissingAttendanceDays)
    return {
      isIncomplete: false,
      completedThroughDate: monthEndDate,
      completedWorkingDays: record.totalWorkingDays,
      payableDays: Math.max(0, record.payableDays - pendingMissingAttendanceDays),
      paidSalaryDays,
      lopDays: record.lopDays,
      lopDeduction: record.lopDeduction,
      netSalary: pendingMissingAttendanceDays ? roundMoney(dailySalary * paidSalaryDays) : record.netSalary,
    }
  }

  const completedWorkingDays = payrollMonthDates(record.month)
    .filter((date) => date >= employmentStartDate && date <= completedThroughDate && parseDateOnly(date)?.getUTCDay() !== 0)
    .length
  const leaveLopDays = Object.entries(record.approvedLeaveLopUnits)
    .filter(([date]) => date <= completedThroughDate)
    .reduce((total, [, unit]) => total + unit, 0)
  const missingAttendanceLopDays = Object.entries(record.missingAttendanceDecisions)
    .filter(([date, decision]) => date <= completedThroughDate && decision === 'lop')
    .reduce((total, [date]) => total + (record.missingAttendanceUnits[date] || 1), 0)
  const pendingMissingAttendanceDays = record.missingAttendanceDates
    .filter((date) => date <= completedThroughDate && !record.missingAttendanceDecisions[date])
    .reduce((total, date) => total + (record.missingAttendanceUnits[date] || 1), 0)
  const lopDays = leaveLopDays + missingAttendanceLopDays
  const payableDays = Math.max(0, completedWorkingDays - lopDays - pendingMissingAttendanceDays)
  const completedCalendarDays = payrollMonthDates(record.month)
    .filter((date) => date >= employmentStartDate && date <= completedThroughDate)
    .length
  const paidSalaryDays = Math.max(0, completedCalendarDays - lopDays - pendingMissingAttendanceDays)

  return {
    isIncomplete: true,
    completedThroughDate,
    completedWorkingDays,
    payableDays,
    paidSalaryDays,
    lopDays,
    lopDeduction: roundMoney(dailySalary * lopDays),
    netSalary: roundMoney(dailySalary * paidSalaryDays),
  }
}

export function nextPayrollStatus(status: PayrollStatus): PayrollStatus | null {
  if (status === 'draft') return 'calculated'
  if (status === 'calculated') return 'approved'
  if (status === 'approved') return 'paid'
  return null
}
