import type { LeaveRequestRecord } from '@/lib/firestore'
import { formatDateOnlyDisplay } from '@/lib/date-only'

export function LeaveDateSummary({ leave }: { leave: LeaveRequestRecord }) {
  const dateLabel = leave.startDate === leave.endDate
    ? formatDateOnlyDisplay(leave.startDate)
    : `${formatDateOnlyDisplay(leave.startDate)} to ${formatDateOnlyDisplay(leave.endDate)}`
  const durationLabel = leave.durationType === 'half_day'
    ? `Half day (${leave.halfDayPeriod === 'second_half' ? 'second half' : 'first half'})`
    : `${leave.durationDays} ${leave.durationDays === 1 ? 'day' : 'days'}`
  const treatmentLabel = leave.status === 'approved' && leave.durationType === 'half_day'
    ? ` · ${leave.payrollTreatment === 'lop' ? '0.5 LOP' : '0.5 CL'}`
    : ''

  return (
    <div>
      <p>{dateLabel}</p>
      <p className="mt-1 text-xs text-ghost">Leave · {durationLabel}{treatmentLabel}</p>
    </div>
  )
}
