export type AdminNotification = {
  id: string
  type: 'leave_submitted'
  leaveId: string
  staffEmail: string
  startDate: string
  endDate: string
  durationDays: number
  createdAt: string
  unread: boolean
}

export type AdminNotificationPage = {
  notifications: AdminNotification[]
  unreadCount: number
  nextCursor: string | null
}
