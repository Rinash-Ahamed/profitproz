export const LEAVE_ALLOWANCES = {
  sick: 3,
  flexi: 2,
} as const

export type LeaveType = keyof typeof LEAVE_ALLOWANCES

export function leaveTypeLabel(type: LeaveType | 'legacy') {
  if (type === 'sick') return 'Sick leave'
  if (type === 'flexi') return 'Flexi leave'
  return 'Leave'
}
