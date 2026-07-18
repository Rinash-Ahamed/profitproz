import type { LeaveRequestRecord } from '@/lib/firestore'
import { formatDateOnlyDisplay } from '@/lib/date-only'
import { leaveTypeLabel } from '@/lib/leave'

export function LeaveDateSummary({ leave }: { leave: LeaveRequestRecord }) {
  return (
    <div>
      <p>{formatDateOnlyDisplay(leave.startDate)} to {formatDateOnlyDisplay(leave.endDate)}</p>
      <p className="mt-1 text-xs text-ghost">
        {leaveTypeLabel(leave.leaveType)} · {leave.durationDays} {leave.durationDays === 1 ? 'day' : 'days'}
      </p>
    </div>
  )
}
