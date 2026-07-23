'use client'

import { FormEvent, Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Building2, CheckCircle2, ChevronDown, ChevronRight, Clock3, CreditCard, Download, Edit, Eye, EyeOff, FileDown, FileText, KeyRound, Loader2, LogOut, Play, ReceiptText, RefreshCw, Search, Square, Trash2, User, UserPlus, Users, WalletCards, XCircle } from 'lucide-react'
import type { SessionUser } from '@/lib/auth'
import type { DashboardSummary, ExpenseFieldSettings, ExpenseRecord, LeaveRequestRecord, PropertyRecord, PublicStaffRecord, SalaryRecord, SecuritySettings, WorkSessionRecord } from '@/lib/firestore'
import type { OnboardingRecord } from '@/lib/onboarding'
import { getVersionLabel, type AppVersion } from '@/lib/version'
import { ClientServicesPanel } from '@/app/client-services-panel'
import { FinancePanel } from '@/app/finance-panel'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { LeaveDateSummary } from '@/components/ui/LeaveDateSummary'
import { countDateOnlyDaysInclusive, formatDateOnlyDisplay, todayLocalDateOnly } from '@/lib/date-only'
import { apiFetch, authenticatedFetch as fetch } from '@/lib/client-api'
import { LEAVE_ALLOWANCES, leaveTypeLabel, type LeaveType } from '@/lib/leave'
import { escapeHtml } from '@/lib/html'
import { getPdfRenderScale, releasePdfCanvas, waitForPdfAssets } from '@/lib/client-pdf'
import { STAFF_DEPARTMENTS, STAFF_ROLES } from '@/lib/staff-options'
import { ADMIN_NAMES } from '@/lib/admin-options'

type PortalHomeProps = {
  user: SessionUser
  version: AppVersion
  title: string
  description?: string
}

type PayrollRow = {
  employeeName: string
  employeeId: string
  department: string
  payrollPeriod: string
  monthlySalary: number
  completedWorkDays: number
}

type TaskStatusFilter = 'all' | 'working' | 'completed' | 'not-started'
type TaskDurationSort = 'recent' | 'highest' | 'lowest'
type DailyWorkSummary = {
  key: string
  staffEmail: string
  workDate: string
  sessions: WorkSessionRecord[]
  status: 'active' | 'completed' | 'not-started'
  durationMinutes: number
}

const ADMIN_TAB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  staff: 'Employees',
  properties: 'Clients',
  tasks: 'Tasks',
  expenses: 'Expenses',
  leaves: 'Leaves',
  payroll: 'Payroll',
  finance: 'Finance',
  settings: 'Settings',
}

export function PortalHome({ user, version, title, description }: PortalHomeProps) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [staffSubTab, setStaffSubTab] = useState('all')
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Staff creation state
  const [staffFirstName, setStaffFirstName] = useState('')
  const [staffLastName, setStaffLastName] = useState('')
  const [staffPersonalEmail, setStaffPersonalEmail] = useState('')
  const [staffEmployeeId, setStaffEmployeeId] = useState('')
  const [staffDepartment, setStaffDepartment] = useState('')
  const [staffRole, setStaffRole] = useState('')
  const [staffCtc, setStaffCtc] = useState('')
  const [staffRevenueAccess, setStaffRevenueAccess] = useState(false)
  const [staffOnboardingAccess, setStaffOnboardingAccess] = useState(false)
  // Staff list state
  const [staffList, setStaffList] = useState<PublicStaffRecord[]>([])
  const staffListLoadedRef = useRef(false)
  const [staffSearch, setStaffSearch] = useState('')
  const [salaryList, setSalaryList] = useState<SalaryRecord[]>([])
  const [editingStaff, setEditingStaff] = useState<PublicStaffRecord | null>(null)
  const [offerStaff, setOfferStaff] = useState<PublicStaffRecord | null>(null)
  const [propertyList, setPropertyList] = useState<PropertyRecord[]>([])
  const [onboardingList, setOnboardingList] = useState<OnboardingRecord[]>([])
  // Daily task and work-session state
  const [workSessionList, setWorkSessionList] = useState<WorkSessionRecord[]>([])
  const [taskEmployeeSearch, setTaskEmployeeSearch] = useState('')
  const [taskDateFilter, setTaskDateFilter] = useState('')
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('all')
  const [taskDurationSort, setTaskDurationSort] = useState<TaskDurationSort>('recent')
  const [expandedTaskSummary, setExpandedTaskSummary] = useState('')
  const [correctingWorkSession, setCorrectingWorkSession] = useState<WorkSessionRecord | null>(null)
  const [workNotes, setWorkNotes] = useState('')
  const [workActionLoading, setWorkActionLoading] = useState(false)
  const [workClock, setWorkClock] = useState(() => Date.now())
  // Expense state
  const [expenseList, setExpenseList] = useState<ExpenseRecord[]>([])
  const [leaveList, setLeaveList] = useState<LeaveRequestRecord[]>([])
  const [leaveStartDate, setLeaveStartDate] = useState('')
  const [leaveEndDate, setLeaveEndDate] = useState('')
  const [leaveType, setLeaveType] = useState<LeaveType>('sick')
  const [leaveReason, setLeaveReason] = useState('')
  const [deletingLeaveId, setDeletingLeaveId] = useState('')
  const requestedLeaveDays = countDateOnlyDaysInclusive(leaveStartDate, leaveEndDate)
  const selectedLeaveYear = leaveStartDate.slice(0, 4) || String(new Date().getFullYear())
  const usedLeaveDays = leaveList.reduce((total, leave) => {
    if (leave.status === 'rejected' || leave.leaveType !== leaveType || !leave.startDate.startsWith(`${selectedLeaveYear}-`)) return total
    return total + (leave.durationDays || countDateOnlyDaysInclusive(leave.startDate, leave.endDate))
  }, 0)
  const remainingLeaveDays = Math.max(0, LEAVE_ALLOWANCES[leaveType] - usedLeaveDays)
  const exceedsLeaveBalance = requestedLeaveDays > remainingLeaveDays
  const [expenseCity, setExpenseCity] = useState('')
  const [expenseType, setExpenseType] = useState<'travel' | 'food' | 'fuel' | 'other'>('travel')
  const [customExpenseType, setCustomExpenseType] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNotes, setExpenseNotes] = useState('')
  const [expenseReceiptUrl, setExpenseReceiptUrl] = useState('')
  const [expenseDate, setExpenseDate] = useState(todayLocalDateOnly())
  const [deletingExpenseId, setDeletingExpenseId] = useState('')
  const [correctingExpense, setCorrectingExpense] = useState<ExpenseRecord | null>(null)
  const [adminExpenseName, setAdminExpenseName] = useState('')
  const [expenseTrackingView, setExpenseTrackingView] = useState<'staff' | 'admin'>('staff')
  const [expensePersonSearch, setExpensePersonSearch] = useState('')
  const [expensePaymentFilter, setExpensePaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [expenseSettings, setExpenseSettings] = useState<ExpenseFieldSettings>({ cityRequired: true, descriptionRequired: true, receiptRequired: true })
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({ sessionHours: 12, minPasswordLength: 8, requireUppercase: false, requireNumber: false })
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [profilePhone, setProfilePhone] = useState('')
  const [profileAddress, setProfileAddress] = useState('')
  const [profileDetails, setProfileDetails] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [adminCurrentPassword, setAdminCurrentPassword] = useState('')
  const [adminNewPassword, setAdminNewPassword] = useState('')
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!message && !error) return

    const timer = setTimeout(() => {
      setMessage('')
      setError('')
    }, 3000)
    return () => clearTimeout(timer)
  }, [message, error])

  useEffect(() => {
    if (!user.expiresAt) return

    let redirecting = false
    const expireSession = () => {
      if (redirecting) return
      redirecting = true
      fetch('/api/logout', { method: 'POST', credentials: 'same-origin', keepalive: true })
        .finally(() => window.location.replace('/login?reason=session-expired'))
    }
    const checkSessionLimit = () => {
      if (Date.now() >= user.expiresAt!) expireSession()
    }
    const timer = window.setTimeout(expireSession, Math.max(0, user.expiresAt - Date.now()))

    document.addEventListener('visibilitychange', checkSessionLimit)
    window.addEventListener('focus', checkSessionLimit)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', checkSessionLimit)
      window.removeEventListener('focus', checkSessionLimit)
    }
  }, [user.expiresAt])

  useEffect(() => {
    if (user.role !== 'admin') return
    const controller = new AbortController()
    const tabFetch = (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: controller.signal })
    const reportError = (fallback: string) => (caught: unknown) => {
      if (controller.signal.aborted || (caught instanceof Error && caught.name === 'AbortError')) return
      setError(fallback)
    }
    const finishLoading = () => {
      if (!controller.signal.aborted) setLoading(false)
    }

    if (activeTab === 'dashboard') {
      setLoading(true)
      apiFetch<{ summary: DashboardSummary }>('/api/dashboard', { signal: controller.signal })
        .then((data) => { if (!controller.signal.aborted) setDashboardSummary(data.summary) })
        .catch(reportError('Could not load dashboard data.'))
        .finally(finishLoading)
    }

    if (activeTab === 'staff') {
      setLoading(true)
      tabFetch('/api/admin/staff')
        .then((res) => res.json())
        .then((data) => {
          if (controller.signal.aborted) return
          if (data.staff) {
            setStaffList(data.staff)
            staffListLoadedRef.current = true
          }
        })
        .catch(reportError('Could not load employee list.'))
        .finally(finishLoading)
    }

    if (activeTab === 'properties') {
      setLoading(true)
      Promise.all([tabFetch('/api/admin/properties'), tabFetch('/api/admin/onboardings', { credentials: 'same-origin', cache: 'no-store' })])
        .then(async ([propertyRes, onboardingRes]) => {
          const [propertyData, onboardingData] = await Promise.all([propertyRes.json(), onboardingRes.json()])
          if (controller.signal.aborted) return
          if (propertyData.properties) setPropertyList(propertyData.properties)
          if (onboardingData.onboardings) setOnboardingList(onboardingData.onboardings)
        })
        .catch(reportError('Could not load client properties.'))
        .finally(finishLoading)
    }

    if (activeTab === 'tasks') {
      setLoading(true)
      Promise.all([
        tabFetch('/api/admin/tasks'),
        staffListLoadedRef.current ? Promise.resolve(null) : tabFetch('/api/admin/staff'),
      ])
        .then(async ([taskRes, staffRes]) => {
          const taskData = await taskRes.json()
          if (controller.signal.aborted) return
          if (taskData.workSessions) setWorkSessionList(taskData.workSessions)
          if (staffRes) {
            const staffData = await staffRes.json()
            if (staffData.staff) {
              setStaffList(staffData.staff)
              staffListLoadedRef.current = true
            }
          }
        })
        .catch(reportError('Could not load employee task logs.'))
        .finally(finishLoading)
    }

    if (activeTab === 'expenses') {
      setLoading(true)
      tabFetch('/api/admin/expenses')
        .then((res) => res.json())
        .then((data) => {
          if (controller.signal.aborted) return
          if (data.expenses) {
            setExpenseList(data.expenses)
          }
          if (data.settings) setExpenseSettings(data.settings)
        })
        .catch(reportError('Could not load expenses.'))
        .finally(finishLoading)
    }

    if (activeTab === 'payroll') {
      setLoading(true)
      Promise.all([tabFetch('/api/admin/salaries'), tabFetch('/api/admin/tasks')])
        .then(async ([salaryRes, taskRes]) => {
          const [salaryData, taskData] = await Promise.all([salaryRes.json(), taskRes.json()])
          if (controller.signal.aborted) return
          if (salaryData.staff) {
            setStaffList(salaryData.staff)
            staffListLoadedRef.current = true
          }
          if (salaryData.salaries) setSalaryList(salaryData.salaries)
          if (taskData.workSessions) setWorkSessionList(taskData.workSessions)
        })
        .catch(reportError('Could not load payroll data.'))
        .finally(finishLoading)
    }

    if (activeTab === 'leaves') {
      setLoading(true)
      tabFetch('/api/admin/leaves').then((res) => res.json()).then((data) => { if (!controller.signal.aborted && data.leaves) setLeaveList(data.leaves) }).catch(reportError('Could not load leave requests.')).finally(finishLoading)
    }

    if (activeTab === 'settings') {
      Promise.all([tabFetch('/api/admin/expense-settings'), tabFetch('/api/admin/security-settings')])
        .then(async ([expenseRes, securityRes]) => {
          const [expenseData, securityData] = await Promise.all([expenseRes.json(), securityRes.json()])
          if (controller.signal.aborted) return
          if (expenseData.settings) setExpenseSettings(expenseData.settings)
          if (securityData.settings) setSecuritySettings(securityData.settings)
        })
        .catch(reportError('Could not load expense settings.'))
    }
    return () => controller.abort()
  }, [activeTab, user.role])

  useEffect(() => {
    if (user.role !== 'staff' || user.mustChangePassword) return
    const controller = new AbortController()
    const tabFetch = (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: controller.signal })
    const reportError = (fallback: string) => (caught: unknown) => {
      if (controller.signal.aborted || (caught instanceof Error && caught.name === 'AbortError')) return
      setError(caught instanceof Error && caught.message ? caught.message : fallback)
    }
    const finishLoading = () => {
      if (!controller.signal.aborted) setLoading(false)
    }

    if (activeTab === 'dashboard') {
      setLoading(true)
      apiFetch<{ summary: DashboardSummary }>('/api/dashboard', { signal: controller.signal }).then((data) => { if (!controller.signal.aborted) setDashboardSummary(data.summary) }).catch(reportError('Could not load dashboard data.')).finally(finishLoading)
    }

    if (activeTab === 'expenses') {
      setLoading(true)
      tabFetch('/api/staff/expenses')
        .then((res) => res.json())
        .then((data) => {
          if (controller.signal.aborted) return
          if (data.expenses) {
            setExpenseList(data.expenses)
          }
        })
        .catch(reportError('Could not load your expenses.'))
        .finally(finishLoading)
    }

    if (activeTab === 'tasks') {
      setLoading(true)
      tabFetch('/api/staff/tasks')
        .then(async (response) => {
          const data = await response.json()
          if (controller.signal.aborted) return
          if (!response.ok) throw new Error(data.message || 'Could not load your work log.')
          if (data.workSessions) setWorkSessionList(data.workSessions)
        })
        .catch(reportError('Could not load your work log.'))
        .finally(finishLoading)
    }

    if (activeTab === 'leaves') {
      setLoading(true)
      tabFetch('/api/staff/leaves').then((res) => res.json()).then((data) => { if (!controller.signal.aborted && data.leaves) setLeaveList(data.leaves) }).catch(reportError('Could not load your leave requests.')).finally(finishLoading)
    }

    if (activeTab === 'properties') {
      setLoading(true)
      Promise.all([tabFetch('/api/properties'), tabFetch('/api/onboardings')])
        .then(async ([propertyRes, onboardingRes]) => {
          const [propertyData, onboardingData] = await Promise.all([propertyRes.json(), onboardingRes.json()])
          if (controller.signal.aborted) return
          if (propertyData.properties) setPropertyList(propertyData.properties)
          if (onboardingData.onboardings) setOnboardingList(onboardingData.onboardings)
        })
        .catch(reportError('Could not load client properties.'))
        .finally(finishLoading)
    }

    return () => controller.abort()
  }, [activeTab, user.mustChangePassword, user.role])

  useEffect(() => {
    if (user.role !== 'staff' || !user.mustChangePassword) return

    apiFetch<{ settings: SecuritySettings }>('/api/staff/change-password')
      .then((data) => setSecuritySettings(data.settings))
      .catch(() => setError('Could not load the password policy. The server will still enforce the current security settings.'))
  }, [user.mustChangePassword, user.role])

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  async function addStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: staffFirstName, lastName: staffLastName, personalEmail: staffPersonalEmail, annualCtc: Number(staffCtc), employeeId: staffEmployeeId, department: staffDepartment, role: staffRole, clientAccess: { revenueManagement: staffRevenueAccess, otaOnboarding: staffOnboardingAccess } }),
      })
      const data = (await response.json()) as { message?: string; initialPassword?: string; staff: PublicStaffRecord }

      if (!response.ok) {
        setError(data.message || 'Unable to add employee.')
        return
      }

      setStaffFirstName('')
      setStaffLastName('')
      setStaffPersonalEmail('')
      setStaffEmployeeId('')
      setStaffDepartment('')
      setStaffRole('')
      setStaffCtc('')
      setStaffRevenueAccess(false)
      setStaffOnboardingAccess(false)
      setMessage('Employee added successfully.')
      if (data.initialPassword) {
        window.prompt('Copy this one-time temporary password and share it through a secure channel:', data.initialPassword)
      }
      // Refresh staff list with the new record from the API response
      setStaffList((prev) => [...prev, data.staff].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
      setStaffSubTab('all')
      setOfferStaff(data.staff)
    } catch {
      setError('Unable to add employee right now.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteStaff(staffId: string, staffName: string, staffEmail: string) {
    if (!window.confirm(`Delete ${staffName} and all of their tasks, leave requests, and salary records? Expense and receipt history will be preserved. This action cannot be undone.`)) {
      return
    }

    // For now, a global loader is acceptable. A row-specific loader would be a UX enhancement.
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        let errorMessage = 'Failed to delete employee.'
        try {
          const data = await response.json()
          errorMessage = data.message || errorMessage
        } catch (e) {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      setStaffList((prev) => prev.filter((s) => s.id !== staffId))
      setSalaryList((prev) => prev.filter((salary) => salary.id !== staffId && salary.staffEmail !== staffEmail))
      setWorkSessionList((prev) => prev.filter((session) => session.staffEmail !== staffEmail))
      setLeaveList((prev) => prev.filter((leave) => leave.staffEmail !== staffEmail))
      setMessage('Employee records deleted. Expense and receipt history was preserved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(staffId: string, staffName: string) {
    if (!window.confirm(`Reset the password for ${staffName}? A new one-time temporary password will be generated and all existing sessions will be revoked.`)) {
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`/api/admin/staff/${staffId}/reset-password`, {
        method: 'PATCH',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password.')
      }

      setMessage(`Password for ${staffName} has been reset and existing sessions were revoked.`)
      if (typeof data.initialPassword === 'string') {
        window.prompt('Copy this one-time temporary password and share it through a secure channel:', data.initialPassword)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    } finally {
      setLoading(false)
    }
  }

  async function activateAcknowledgedStaff(staff: PublicStaffRecord) {
    if (!window.confirm(`Confirm that ${staff.name} acknowledged the offer by email and activate their employee access?`)) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/staff/${staff.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      })
      const data = await response.json() as { staff?: PublicStaffRecord; message?: string }
      if (!response.ok || !data.staff) throw new Error(data.message || 'Failed to activate employee.')
      setStaffList((current) => current.map((item) => item.id === data.staff!.id ? data.staff! : item))
      setMessage(`${staff.name} is now active.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to activate employee.')
    } finally {
      setLoading(false)
    }
  }

  async function handleExpenseStatusUpdate(expenseId: string, status: 'approved' | 'rejected') {
    const decisionNote = status === 'rejected' ? window.prompt('Rejection reason (shown to the employee):') : ''
    if (status === 'rejected' && decisionNote === null) return
    const originalExpenses = [...expenseList]
    setExpenseList((prev) => prev.map((expense) => (expense.id === expenseId ? { ...expense, status } : expense)))

    try {
      const response = await fetch(`/api/admin/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, decisionNote }),
      })

      if (!response.ok) {
        setExpenseList(originalExpenses)
        const data = await response.json().catch(() => null)
        setError(data?.message || 'Failed to update expense status.')
      }
    } catch (err) {
      setExpenseList(originalExpenses)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    }
  }

  async function markExpenseReimbursed(expense: ExpenseRecord) {
    if (expense.status !== 'approved' || expense.paymentStatus === 'paid') return
    if (!window.confirm(`Confirm that ${expense.staffName || expense.staffEmail} has been reimbursed?`)) return
    setDeletingExpenseId(expense.id)
    setError('')
    try {
      const response = await fetch(`/api/admin/expenses/${encodeURIComponent(expense.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_paid' }),
      })
      const data = await response.json() as { expense?: ExpenseRecord; message?: string }
      if (!response.ok || !data.expense) throw new Error(data.message || 'Unable to mark this reimbursement as paid.')
      setExpenseList((current) => current.map((item) => item.id === data.expense!.id ? data.expense! : item))
      setMessage('Expense reimbursement marked as paid.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update the reimbursement.')
    } finally {
      setDeletingExpenseId('')
    }
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch(user.role === 'admin' ? '/api/admin/expenses' : '/api/staff/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: expenseCity, expenseType, customExpenseType: expenseType === 'other' ? customExpenseType : '', description: expenseNotes, amount: Number(expenseAmount), receiptUrl: expenseReceiptUrl, expenseDate, ...(user.role === 'admin' ? { adminName: adminExpenseName } : {}) }),
      })
      const data = (await response.json()) as { message?: string; expense?: ExpenseRecord }

      if (!response.ok || !data.expense) {
        setError(data.message || 'Unable to submit expense.')
        return
      }

      setExpenseCity('')
      setExpenseAmount('')
      setCustomExpenseType('')
      setExpenseNotes('')
      setExpenseReceiptUrl('')
      setExpenseDate(todayLocalDateOnly())
      if (user.role === 'admin') setAdminExpenseName('')
      setExpenseList((prev) => [data.expense!, ...prev])
      setMessage(user.role === 'admin' ? 'Expense recorded successfully.' : 'Expense submitted for admin approval.')
    } catch {
      setError('Unable to submit expense right now.')
    } finally {
      setLoading(false)
    }
  }

  async function withdrawExpense(expense: ExpenseRecord) {
    if (expense.status !== 'pending' || !window.confirm('Withdraw this Pending expense?')) return
    setDeletingExpenseId(expense.id)
    setError('')
    try {
      const response = await fetch(`/api/staff/expenses/${encodeURIComponent(expense.id)}`, { method: 'DELETE' })
      const data = await response.json() as { message?: string }
      if (!response.ok) throw new Error(data.message || 'Unable to withdraw expense.')
      setExpenseList((current) => current.filter((item) => item.id !== expense.id))
      setMessage('Expense withdrawn.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to withdraw expense.')
    } finally {
      setDeletingExpenseId('')
    }
  }

  async function withdrawAdminExpense(expense: ExpenseRecord) {
    if (expense.submittedByRole !== 'admin' || expense.staffEmail.toLowerCase() !== user.email.toLowerCase() || !window.confirm('Withdraw this Admin expense?')) return
    setDeletingExpenseId(expense.id)
    setError('')
    try {
      const response = await fetch(`/api/admin/expenses/${encodeURIComponent(expense.id)}`, { method: 'DELETE' })
      const data = await response.json() as { message?: string }
      if (!response.ok) throw new Error(data.message || 'Unable to withdraw Admin expense.')
      setExpenseList((current) => current.filter((item) => item.id !== expense.id))
      setMessage('Admin expense withdrawn.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to withdraw Admin expense.')
    } finally {
      setDeletingExpenseId('')
    }
  }

  async function startWork() {
    setWorkActionLoading(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/staff/tasks', {
        method: 'POST',
      })
      const data = await response.json() as { workSession?: WorkSessionRecord; message?: string }
      if (!response.ok || !data.workSession) throw new Error(data.message || 'Unable to start work.')
      setWorkSessionList((current) => [data.workSession!, ...current])
      setWorkClock(Date.now())
      setMessage('Work timer started.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to start work right now.')
    } finally {
      setWorkActionLoading(false)
    }
  }

  async function endWork(session: WorkSessionRecord) {
    const notes = workNotes.trim()
    if (notes.length < 3) {
      setError('Add a short summary of the work completed today.')
      return
    }
    setWorkActionLoading(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`/api/staff/tasks/${encodeURIComponent(session.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const data = await response.json() as { workSession?: WorkSessionRecord; message?: string }
      if (!response.ok || !data.workSession) throw new Error(data.message || 'Unable to end work.')
      setWorkSessionList((current) => current.map((item) => item.id === data.workSession!.id ? data.workSession! : item))
      setWorkNotes('')
      setMessage('Work completed and today’s summary saved.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to end work right now.')
    } finally {
      setWorkActionLoading(false)
    }
  }

  async function submitLeaveRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/staff/leaves', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: leaveStartDate, endDate: leaveEndDate, leaveType, reason: leaveReason }) })
      const data = await response.json() as { leave?: LeaveRequestRecord; message?: string }
      if (!response.ok || !data.leave) throw new Error(data.message || 'Unable to submit leave request.')
      setLeaveList((current) => [data.leave!, ...current]); setLeaveStartDate(''); setLeaveEndDate(''); setLeaveType('sick'); setLeaveReason(''); setMessage('Leave request submitted.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to submit leave request.') } finally { setLoading(false) }
  }

  async function updateLeaveStatus(id: string, status: 'approved' | 'rejected') {
    const decisionNote = status === 'rejected' ? window.prompt('Rejection reason (shown to the employee):') : ''
    if (decisionNote === null) return
    const response = await fetch(`/api/admin/leaves/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, decisionNote }) })
    const data = await response.json() as { leave?: LeaveRequestRecord; message?: string }
    if (!response.ok || !data.leave) { setError(data.message || 'Unable to update leave request.'); return }
    setLeaveList((current) => current.map((leave) => leave.id === id ? data.leave! : leave))
  }

  async function withdrawLeaveRequest(leave: LeaveRequestRecord) {
    if (leave.status !== 'pending' || !window.confirm('Withdraw this Pending leave request?')) return
    setDeletingLeaveId(leave.id)
    setError('')
    try {
      const response = await fetch(`/api/staff/leaves/${encodeURIComponent(leave.id)}`, { method: 'DELETE' })
      const data = await response.json() as { message?: string }
      if (!response.ok) throw new Error(data.message || 'Unable to withdraw leave request.')
      setLeaveList((current) => current.filter((item) => item.id !== leave.id))
      setMessage('Leave request withdrawn.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to withdraw leave request.')
    } finally {
      setDeletingLeaveId('')
    }
  }

  async function clearAuditLogs() {
    if (!window.confirm('Clear all audit logs? This keeps a new record that the logs were cleared.')) {
      return
    }

    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/admin/audit-logs', {
        method: 'DELETE',
      })
      const data = (await response.json()) as { message?: string; deleted?: number }

      if (!response.ok) {
        setError(data.message || 'Unable to clear audit logs.')
        return
      }

      setMessage(`Audit logs cleared. Removed ${data.deleted || 0} records.`)
    } catch {
      setError('Unable to clear audit logs right now.')
    } finally {
      setLoading(false)
    }
  }

  async function saveExpenseSettings() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/expense-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(expenseSettings) })
      if (!response.ok) throw new Error()
      setMessage('Expense field settings saved.')
    } catch {
      setError('Unable to save expense field settings.')
    } finally {
      setLoading(false)
    }
  }

  async function saveSecuritySettings() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await apiFetch<{ settings: SecuritySettings }>('/api/admin/security-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(securitySettings) })
      setSecuritySettings(data.settings)
      setMessage('Security settings saved.')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save security settings.') } finally { setLoading(false) }
  }

  async function changeAdminPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (adminNewPassword !== adminConfirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setLoading(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: adminCurrentPassword, newPassword: adminNewPassword }),
      })
      const data = await response.json() as { message?: string }
      if (!response.ok) throw new Error(data.message || 'Unable to change admin password.')
      setAdminCurrentPassword('')
      setAdminNewPassword('')
      setAdminConfirmPassword('')
      setMessage('Admin password updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change admin password.')
    } finally {
      setLoading(false)
    }
  }

  function handleExportPayroll() {
    if (payrollRows.length === 0) {
      setError('No payroll data is available to export.')
      return
    }

    const headers: (keyof PayrollRow)[] = ['employeeName', 'employeeId', 'department', 'payrollPeriod', 'monthlySalary', 'completedWorkDays']
    const headerRow = 'Employee Name,Employee ID,Department,Payroll Period,Monthly Salary,Completed Work Days'

    const csvRows = payrollRows.map(row =>
      headers.map(header => {
        const value = row[header]
        // Handle values that might contain commas by enclosing them in double quotes
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(',')
    )

    const csvContent = [headerRow, ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'payroll-report-june-2024.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function handleExportWorkingDays() {
    const query = taskEmployeeSearch.trim().toLowerCase()
    const completedSessions = workSessionList
      .filter((session) => session.status === 'completed')
      .filter((session) => !taskDateFilter || session.workDate === taskDateFilter)
      .filter((session) => {
        if (!query) return true
        const employeeName = staffNameByEmail.get(session.staffEmail) || ''
        return employeeName.toLowerCase().includes(query) || session.staffEmail.toLowerCase().includes(query)
      })

    if (!completedSessions.length) {
      setError('No completed working days match the selected employee and date filters.')
      return
    }

    const byEmployee = new Map<string, { dates: Set<string>; minutes: number }>()
    completedSessions.forEach((session) => {
      const existing = byEmployee.get(session.staffEmail) || { dates: new Set<string>(), minutes: 0 }
      existing.dates.add(session.workDate)
      existing.minutes += Math.max(0, session.durationMinutes)
      byEmployee.set(session.staffEmail, existing)
    })

    const csvValue = (value: unknown) => {
      const text = String(value ?? '')
      const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
      return `"${safeText.replaceAll('"', '""')}"`
    }
    const rows = [...byEmployee.entries()]
      .map(([email, summary]) => ({
        name: staffNameByEmail.get(email) || email,
        email,
        workingDays: summary.dates.size,
        totalMinutes: Math.round(summary.minutes),
        dates: [...summary.dates].sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((row) => [
        row.name,
        row.email,
        row.workingDays,
        row.totalMinutes,
        formatWorkDuration(row.totalMinutes),
        row.dates.map(formatDateOnlyDisplay).join('; '),
      ].map(csvValue).join(','))

    const csv = ['sep=,', 'Employee,Email,Working Days,Total Minutes,Total Hours,Worked Dates', ...rows].join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `working-days-${taskDateFilter || 'all-dates'}-${todayLocalDateOnly()}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function handleExportExpenses() {
    const exportExpenses = visibleTrackedExpenses
    if (exportExpenses.length === 0) {
      setError('No expense data is available to export.')
      return
    }
    const csvValue = (value: unknown) => {
      const text = String(value ?? '')
      const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
      return `"${safeText.replaceAll('"', '""')}"`
    }
    const rows = exportExpenses.map((expense) => [expense.expenseDate, expense.staffName || expense.staffEmail, expense.staffEmail, expense.submittedByRole || 'staff', expense.expenseType === 'other' ? expense.customExpenseType || 'Other' : expense.expenseType, expense.city, expense.description, expense.amount, expense.status, expense.receiptUrl || ''].map(csvValue).join(','))
    // The separator directive makes Excel use comma-delimited columns even on
    // Windows installations whose regional list separator is semicolon.
    const csv = ['sep=,', 'Expense Date,Submitted By,Email,Source,Type,City,Description,Amount,Status,Receipt Link', ...rows].join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${expenseTrackingView}-expense-report-${todayLocalDateOnly()}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/staff/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, phone: profilePhone, address: profileAddress, details: profileDetails, emergencyContactName, emergencyContactPhone }),
      })
      const data = (await response.json()) as { message?: string }

      if (!response.ok) {
        let errorMessage = 'Unable to change password.'
        try {
          errorMessage = data.message || errorMessage
        } catch (e) {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      setCurrentPassword('')
      setNewPassword('')
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setProfilePhone('')
      setProfileAddress('')
      setProfileDetails('')
      setEmergencyContactName('')
      setEmergencyContactPhone('')
      setMessage('Password updated. You can continue using the Employee workspace.')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const emailFromStaffName = (name: string) => {
    if (!name.trim()) return ''
    return `${name.trim().toLowerCase().replace(/\s+/g, '')}@profitproz.com`
  }

  const calculatedMonthlySalary = Number(staffCtc) > 0 ? Number(staffCtc) / 12 : 0
  const visibleStaffList = useMemo(() => {
    const query = staffSearch.trim().toLowerCase()
    return staffList
      .filter((staff) => {
        if (!query) return true
        return [staff.name, staff.email, staff.employeeId, staff.department, staff.role]
          .some((value) => value?.toLowerCase().includes(query))
      })
      .sort((a, b) => {
        if (query) {
          const rankDifference = Number(!a.name.toLowerCase().startsWith(query)) - Number(!b.name.toLowerCase().startsWith(query))
          if (rankDifference) return rankDifference
        }
        return a.name.localeCompare(b.name)
      })
  }, [staffList, staffSearch])

  const inputClass =
    'h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm text-ink placeholder:text-ghost transition-colors focus:border-[#66B159] focus:outline-none focus:ring-1 focus:ring-[#66B159]/40'

  const staffNameByEmail = useMemo(
    () => new Map(staffList.map((staff) => [staff.email, staff.name])),
    [staffList],
  )

  const dailyWorkSummaries = useMemo(() => {
    const query = taskEmployeeSearch.trim().toLowerCase()
    const matchingSessions = workSessionList
      .filter((session) => {
        if (!query) return true
        const employeeName = staffNameByEmail.get(session.staffEmail) || ''
        return employeeName.toLowerCase().includes(query) || session.staffEmail.toLowerCase().includes(query)
      })
      .filter((session) => !taskDateFilter || session.workDate === taskDateFilter)

    const grouped = new Map<string, DailyWorkSummary>()
    matchingSessions.forEach((session) => {
      const key = `${session.staffEmail}:${session.workDate}`
      const existing = grouped.get(key)
      if (existing) {
        existing.sessions.push(session)
        existing.durationMinutes += workSessionDurationMinutes(session, workClock)
        if (session.status === 'active') existing.status = 'active'
      } else {
        grouped.set(key, {
          key,
          staffEmail: session.staffEmail,
          workDate: session.workDate,
          sessions: [session],
          status: session.status,
          durationMinutes: workSessionDurationMinutes(session, workClock),
        })
      }
    })

    let summaries = [...grouped.values()]
    if (taskStatusFilter === 'working') summaries = summaries.filter((summary) => summary.status === 'active')
    if (taskStatusFilter === 'completed') summaries = summaries.filter((summary) => summary.status === 'completed')
    if (taskStatusFilter === 'not-started') {
      const targetDate = taskDateFilter || todayLocalDateOnly()
      const employeesWithSessions = new Set(
        workSessionList.filter((session) => session.workDate === targetDate).map((session) => session.staffEmail),
      )
      summaries = staffList
        .filter((staff) => staff.active && !employeesWithSessions.has(staff.email))
        .filter((staff) => !query || staff.name.toLowerCase().includes(query) || staff.email.toLowerCase().includes(query))
        .map((staff) => ({
          key: `${staff.email}:${targetDate}`,
          staffEmail: staff.email,
          workDate: targetDate,
          sessions: [],
          status: 'not-started' as const,
          durationMinutes: 0,
        }))
    }

    return summaries.sort((a, b) => {
      if (taskDurationSort === 'highest' && b.durationMinutes !== a.durationMinutes) return b.durationMinutes - a.durationMinutes
      if (taskDurationSort === 'lowest' && a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes
      if (query) {
        const aName = staffNameByEmail.get(a.staffEmail)?.toLowerCase() || a.staffEmail.toLowerCase()
        const bName = staffNameByEmail.get(b.staffEmail)?.toLowerCase() || b.staffEmail.toLowerCase()
        const rankDifference = Number(!aName.startsWith(query)) - Number(!bName.startsWith(query))
        if (rankDifference) return rankDifference
      }
      const dateDifference = b.workDate.localeCompare(a.workDate)
      return dateDifference || a.staffEmail.localeCompare(b.staffEmail)
    })
  }, [staffList, staffNameByEmail, taskDateFilter, taskDurationSort, taskEmployeeSearch, taskStatusFilter, workClock, workSessionList])

  const taskTodaySummary = useMemo(() => {
    const today = todayLocalDateOnly()
    const todaySessions = workSessionList.filter((session) => session.workDate === today)
    const employeesWithSessions = new Set(todaySessions.map((session) => session.staffEmail))
    return {
      working: todaySessions.filter((session) => session.status === 'active').length,
      completed: todaySessions.filter((session) => session.status === 'completed').length,
      notStarted: staffList.filter((staff) => staff.active && !employeesWithSessions.has(staff.email)).length,
    }
  }, [staffList, workSessionList])

  const activeWorkSession = user.role === 'staff' ? workSessionList.find((session) => session.status === 'active') : undefined
  const todayCompletedSession = user.role === 'staff'
    ? workSessionList.find((session) => session.status === 'completed' && session.workDate === todayLocalDateOnly())
    : undefined

  useEffect(() => {
    if (!workSessionList.some((session) => session.status === 'active')) return
    setWorkClock(Date.now())
    const timer = window.setInterval(() => setWorkClock(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [workSessionList])

  const payrollRows = useMemo<PayrollRow[]>(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const period = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

    return staffList.map((staff) => {
      const monthlySalary = salaryList.find((salary) => salary.staffEmail === staff.email)?.baseSalary || 0
      const workedDates = new Set(
        workSessionList
          .filter((session) => session.staffEmail === staff.email && session.status === 'completed')
          .map((session) => session.workDate)
          .filter((date) => {
            const parsed = new Date(`${date}T00:00:00`)
            return parsed.getFullYear() === currentYear && parsed.getMonth() === currentMonth
          })
      )

      return { employeeName: staff.name, employeeId: staff.employeeId || 'N/A', department: staff.department || 'N/A', payrollPeriod: period, monthlySalary, completedWorkDays: workedDates.size }
    })
  }, [salaryList, staffList, workSessionList])

  const pendingExpenses = expenseList.filter((expense) => expense.status === 'pending')
  const expensePersonQuery = expensePersonSearch.trim().toLowerCase()
  const visibleTrackedExpenses = expenseList
    .filter((expense) => expenseTrackingView === 'admin' ? expense.submittedByRole === 'admin' : expense.submittedByRole !== 'admin')
    .filter((expense) => !expensePersonQuery || (expense.staffName || expense.staffEmail).toLowerCase().includes(expensePersonQuery))
    .filter((expense) => expensePaymentFilter === 'all' || (expensePaymentFilter === 'paid' ? expense.paymentStatus === 'paid' : expense.status === 'approved' && expense.paymentStatus !== 'paid'))
    .sort((a, b) => {
      if (expensePersonQuery) {
        const aStartsWith = (a.staffName || a.staffEmail).toLowerCase().startsWith(expensePersonQuery)
        const bStartsWith = (b.staffName || b.staffEmail).toLowerCase().startsWith(expensePersonQuery)
        if (aStartsWith !== bStartsWith) return aStartsWith ? -1 : 1
      }
      return (b.expenseDate || b.createdAt || '').localeCompare(a.expenseDate || a.createdAt || '')
    })
  const visibleTrackedExpenseTotal = visibleTrackedExpenses.reduce((total, expense) => total + expense.amount, 0)
  const approvedExpenseTotal = expenseList
    .filter((expense) => expense.status === 'approved')
    .reduce((total, expense) => total + expense.amount, 0)
  const dashboardActiveWorkSessions = dashboardSummary?.activeWorkSessions ?? workSessionList.filter((session) => session.status === 'active').length
  const dashboardPendingExpenses = dashboardSummary?.pendingExpenses ?? pendingExpenses.length
  const dashboardApprovedExpenseTotal = dashboardSummary?.approvedExpenseTotal ?? approvedExpenseTotal
  const recentActivity = [...workSessionList.map((session) => ({ type: 'Task', title: session.workDate, status: session.status, createdAt: session.createdAt })), ...expenseList.map((expense) => ({ type: 'Expense', title: expense.title, status: expense.status, createdAt: expense.createdAt }))]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5)

  return (
    <main className={`portal-app ${user.role === 'admin' ? 'admin-workspace' : ''} relative flex min-h-screen flex-col overflow-hidden bg-[#0a0b0c] px-6 py-8 text-ink sm:px-10`}>
      <video className="portal-video" autoPlay loop muted playsInline preload="metadata" aria-hidden="true">
        <source src="/portal/background.mp4" type="video/mp4" />
      </video>

      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-8">
        <div className="flex flex-1 items-center justify-start">
          <Link href="/" className="inline-flex items-center">
            <Image src="/profitpro.png" alt="ProfitPro" width={190} height={78} className="h-14 w-auto object-contain" priority />
          </Link>
        </div>

        {user.role === 'admin' && (
          <nav className="hidden items-center rounded-full border border-zinc-800 bg-zinc-900/80 p-1 shadow-lg shadow-black/20 backdrop-blur-sm xl:flex">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'dashboard' ? 'bg-zinc-700 text-ink' : 'text-sub hover:text-ink/80'
                }`}
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'staff' ? 'bg-zinc-700 text-ink' : 'text-sub hover:text-ink/80'
                }`}
              >
                Employees
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('properties')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'properties' ? 'bg-zinc-700 text-ink' : 'text-sub hover:text-ink/80'
                }`}
              >
                Clients
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'tasks' ? 'bg-zinc-700 text-ink' : 'text-sub hover:text-ink/80'
                }`}
              >
                Tasks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'expenses' ? 'bg-zinc-700 text-ink' : 'text-sub hover:text-ink/80'
                }`}
              >
                Expenses
              </button>
              <button type="button" onClick={() => setActiveTab('leaves')} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'leaves' ? 'bg-zinc-700 text-ink' : 'text-sub hover:text-ink/80'}`}>Leaves</button>
              <button
                type="button"
                onClick={() => setActiveTab('payroll')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'payroll' ? 'bg-zinc-700 text-ink' : 'text-sub hover:text-ink/80'
                }`}
              >
                Payroll
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('finance')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'finance' ? 'bg-zinc-700 text-ink' : 'text-sub hover:text-ink/80'
                }`}
              >
                Finance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'settings' ? 'bg-zinc-700 text-ink' : 'text-sub hover:text-ink/80'
                }`}
              >
                Settings
              </button>
            </div>
          </nav>
        )}

        {user.role === 'staff' && !user.mustChangePassword && (
          <nav className="hidden items-center rounded-full border border-zinc-800 bg-zinc-900/80 p-1 shadow-lg shadow-black/20 backdrop-blur-sm md:flex">
            <div className="flex items-center gap-1">
              {['dashboard', 'properties', 'expenses', 'tasks', 'leaves'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab ? 'bg-zinc-700 text-ink' : 'text-sub hover:text-ink/80'
                  }`}
                >
                  {tab === 'properties' ? 'Clients' : tab}
                </button>
              ))}
            </div>
          </nav>
        )}

        <div className="relative flex flex-1 items-center justify-end" onMouseEnter={() => setIsProfileOpen(true)} onMouseLeave={() => setIsProfileOpen(false)}>
          <button
            type="button"
            onFocus={() => setIsProfileOpen(true)}
            onClick={() => setIsProfileOpen((open) => !open)}
            aria-label="Open profile menu"
            aria-haspopup="menu"
            aria-expanded={isProfileOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sub transition-colors hover:bg-zinc-700 hover:text-ink"
          >
            <User className="h-5 w-5" />
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 top-10 w-64 pt-2" role="menu">
              <div className="surface rounded-lg p-4 shadow-2xl">
                <p className="mb-3 truncate text-sm text-ink">{user.email}</p>
                <button
                  type="button"
                  onClick={logout}
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sub transition-colors hover:bg-zinc-800 hover:text-ink"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-grow py-14">
        <div className="w-full">
          <div className="glass-pill mb-8 inline-flex items-center gap-2.5 rounded-full px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#66B159] pulse-dot" />
            <span className="label-upper text-ink/80">{user.role} portal</span>
          </div>
          <h1 className={`${user.role === 'admin' ? 'max-w-none whitespace-nowrap text-xl sm:text-4xl lg:text-6xl' : 'max-w-3xl text-4xl sm:text-6xl'} font-bold leading-tight tracking-tight text-ink`}>
            {user.role === 'admin' ? <>Admin Workspace <span className="text-[#66B159]">· {ADMIN_TAB_LABELS[activeTab] || 'Dashboard'}</span></> : title.endsWith(' Workspace') ? <>{title.slice(0, -10)}{' '}<span className="text-[#66B159]"> Workspace</span></> : title}
          </h1>
          {description ? <p className="mt-5 max-w-2xl text-base leading-7 text-sub">{description}</p> : null}

          {/* Mobile nav tabs */}
          {user.role === 'admin' && (
            <div className="mt-10 overflow-x-auto border-b border-zinc-800 xl:hidden">
              <div className="-mb-px flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'dashboard'
                      ? 'border-[#66B159] text-ink'
                      : 'border-transparent text-sub hover:border-zinc-700'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('staff')}
                  className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'staff'
                      ? 'border-[#66B159] text-ink'
                      : 'border-transparent text-sub hover:border-zinc-700'
                  }`}
                >
                  Employees
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('properties')}
                  className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'properties' ? 'border-[#66B159] text-ink' : 'border-transparent text-sub hover:border-zinc-700'
                  }`}
                >
                  Clients
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'tasks'
                      ? 'border-[#66B159] text-ink'
                      : 'border-transparent text-sub hover:border-zinc-700'
                  }`}
                >
                  Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('expenses')}
                  className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'expenses'
                      ? 'border-[#66B159] text-ink'
                      : 'border-transparent text-sub hover:border-zinc-700'
                  }`}
                >
                  Expenses
                </button>
                <button type="button" onClick={() => setActiveTab('leaves')} className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${activeTab === 'leaves' ? 'border-[#66B159] text-ink' : 'border-transparent text-sub hover:border-zinc-700'}`}>Leaves</button>
                <button
                  type="button"
                  onClick={() => setActiveTab('payroll')}
                  className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'payroll' ? 'border-[#66B159] text-ink' : 'border-transparent text-sub hover:border-zinc-700'
                  }`}
                >
                  Payroll
                </button>
                <button type="button" onClick={() => setActiveTab('finance')} className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${activeTab === 'finance' ? 'border-[#66B159] text-ink' : 'border-transparent text-sub hover:border-zinc-700'}`}>Finance</button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'settings' ? 'border-[#66B159] text-ink' : 'border-transparent text-sub hover:border-zinc-700'
                  }`}
                >
                  Settings
                </button>
              </div>
            </div>
          )}

          {user.role === 'staff' && !user.mustChangePassword && (
            <div className="mt-10 overflow-x-auto border-b border-zinc-800 md:hidden">
              <div className="-mb-px flex items-center gap-4">
                {['dashboard', 'properties', 'expenses', 'tasks', 'leaves'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`border-b-2 px-1 py-3 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'border-[#66B159] text-ink'
                        : 'border-transparent text-sub hover:border-zinc-700'
                    }`}
                  >
                    {tab === 'properties' ? 'Clients' : tab}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`mt-10 w-full ${(user.role === 'admin' || activeTab === 'dashboard' || activeTab === 'properties' || activeTab === 'expenses' || activeTab === 'tasks') ? 'max-w-7xl' : 'max-w-3xl'}`}>
            {user.role === 'admin'
              ? {
                   dashboard: (
                    <div className="admin-dashboard space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <DashboardMetric icon={<Users className="h-5 w-5" />} label="Active employees" value={dashboardSummary?.staffCount ?? staffList.length} detail="People in your workspace" />
                        <DashboardMetric icon={<Building2 className="h-5 w-5" />} label="Active client properties" value={propertyList.filter((property) => property.status === 'active').length} detail="Hospitality properties served" />
                        <DashboardMetric icon={<Clock3 className="h-5 w-5" />} label="Working now" value={dashboardActiveWorkSessions} detail="Active employee work sessions" />
                        <DashboardMetric icon={<ReceiptText className="h-5 w-5" />} label="Expenses to review" value={dashboardPendingExpenses} detail="Awaiting a decision" />
                        <DashboardMetric icon={<CheckCircle2 className="h-5 w-5" />} label="Approved expenses" value={`Rs. ${dashboardApprovedExpenseTotal.toLocaleString('en-IN')}`} detail="Total approved to date" />
                      </div>

                      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
                        <div className="surface rounded-lg p-6 sm:p-7">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-lg font-semibold text-ink">Operational overview</p>
                              <p className="mt-1 text-sm text-sub">Monitor active work and pending expense decisions.</p>
                            </div>
                            <button type="button" onClick={() => setActiveTab('tasks')} className="text-sm font-semibold text-[#4d9144] hover:text-[#36722f]">Open Tasks</button>
                          </div>
                          <div className="mt-6 divide-y divide-zinc-200">
                            <DashboardQueueRow label="Employees working now" count={dashboardActiveWorkSessions} action="View tasks" detail={dashboardActiveWorkSessions === 0 ? 'No active work sessions' : `${dashboardActiveWorkSessions} currently working`} onClick={() => setActiveTab('tasks')} />
                            <DashboardQueueRow label="Expense claims" count={dashboardPendingExpenses} action="Open queue" onClick={() => setActiveTab('expenses')} />
                          </div>
                        </div>
                        <div className="surface rounded-lg p-6 sm:p-7">
                          <p className="text-lg font-semibold text-ink">Quick actions</p>
                          <div className="mt-5 grid gap-3">
                            <button type="button" onClick={() => { setActiveTab('staff'); setStaffSubTab('add') }} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-[#66B159]">Add employee <UserPlus className="h-4 w-4 text-[#4d9144]" /></button>
                            <button type="button" onClick={() => setActiveTab('properties')} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-[#66B159]">Manage client properties <Building2 className="h-4 w-4 text-[#4d9144]" /></button>
                            <button type="button" onClick={() => setActiveTab('expenses')} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-[#66B159]">Review expenses <ReceiptText className="h-4 w-4 text-[#4d9144]" /></button>
                            <button type="button" onClick={() => setActiveTab('payroll')} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-[#66B159]">Open payroll <FileDown className="h-4 w-4 text-[#4d9144]" /></button>
                            <button type="button" onClick={() => setActiveTab('finance')} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-[#66B159]">Open finance <WalletCards className="h-4 w-4 text-[#4d9144]" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                  staff: (
                    <div>
                      <div className="mb-6 flex items-center gap-4 border-b border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setStaffSubTab('all')}
                          className={`border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                            staffSubTab === 'all'
                              ? 'border-[#66B159] text-ink'
                              : 'border-transparent text-sub hover:border-zinc-700 hover:text-ink'
                          }`}
                        >
                          All Employees
                        </button>
                        <button
                          type="button"
                          onClick={() => setStaffSubTab('add')}
                          className={`border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                            staffSubTab === 'add'
                              ? 'border-[#66B159] text-ink'
                              : 'border-transparent text-sub hover:border-zinc-700 hover:text-ink'
                          }`}
                        >
                          Add New
                        </button>
                      </div>

                      {staffSubTab === 'add' ? (
                        <form className="surface rounded-lg p-6 sm:p-7" onSubmit={addStaff}>
                          <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#66B159]/10 text-[#66B159]">
                              <UserPlus className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-ink">Add new employee</p>
                              <p className="mt-1 text-sm text-sub">New employees remain Pending until their offer acknowledgment is received and Admin activates access.</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label htmlFor="staffFirstName" className="label-upper mb-2 block text-ghost">
                                First name
                              </label>
                              <input id="staffFirstName" autoComplete="given-name" value={staffFirstName} onChange={(e) => setStaffFirstName(e.target.value)} className={inputClass} required />
                            </div>
                            <div>
                              <label htmlFor="staffLastName" className="label-upper mb-2 block text-ghost">Last name</label>
                              <input id="staffLastName" autoComplete="family-name" value={staffLastName} onChange={(e) => setStaffLastName(e.target.value)} className={inputClass} required />
                            </div>
                            <div>
                              <label htmlFor="staffEmail" className="label-upper mb-2 block text-ghost">
                                Company email (auto-generated)
                              </label>
                              <input id="staffEmail" value={emailFromStaffName(staffFirstName)} className={`${inputClass} bg-zinc-950 text-sub`} readOnly />
                            </div>
                            <div>
                              <label htmlFor="staffPersonalEmail" className="label-upper mb-2 block text-ghost">Personal email</label>
                              <input id="staffPersonalEmail" type="email" autoComplete="email" value={staffPersonalEmail} onChange={(e) => setStaffPersonalEmail(e.target.value)} className={inputClass} required />
                            </div>
                            <div>
                              <label htmlFor="staffEmployeeId" className="label-upper mb-2 block text-ghost">
                                Employee ID
                              </label>
                              <input id="staffEmployeeId" value={staffEmployeeId} onChange={(e) => setStaffEmployeeId(e.target.value)} className={inputClass} required />
                            </div>
                            <div>
                              <label htmlFor="staffDepartment" className="label-upper mb-2 block text-ghost">
                                Department
                              </label>
                              <select id="staffDepartment" value={staffDepartment} onChange={(e) => setStaffDepartment(e.target.value)} className={inputClass} required><option value="" disabled>Select department</option>{STAFF_DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}</select>
                            </div>
                            <div>
                              <label htmlFor="staffRole" className="label-upper mb-2 block text-ghost">
                                Role
                              </label>
                              <select id="staffRole" value={staffRole} onChange={(e) => setStaffRole(e.target.value)} className={inputClass} required><option value="" disabled>Select role</option>{STAFF_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                              <label htmlFor="staffCtc" className="label-upper mb-2 block text-ghost">Annual CTC</label>
                              <input id="staffCtc" type="number" inputMode="decimal" min="0.01" step="0.01" value={staffCtc} onChange={(e) => setStaffCtc(e.target.value)} className={inputClass} placeholder="e.g., 600000" required />
                            </div>
                            <div>
                              <label htmlFor="staffMonthlySalary" className="label-upper mb-2 block text-ghost">Monthly salary (auto-calculated)</label>
                              <input id="staffMonthlySalary" value={calculatedMonthlySalary ? `Rs. ${calculatedMonthlySalary.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : ''} className={`${inputClass} cursor-not-allowed text-sub`} placeholder="CTC / 12" readOnly />
                            </div>
                          </div>

                          <fieldset className="mt-4 rounded-lg border border-zinc-700 bg-zinc-950/30 p-4">
                            <legend className="label-upper px-1 text-ghost">Client service access</legend>
                            <p className="mb-3 text-xs text-sub">Select the client services this employee may create and update. Invoices, payments, contracts, and deletion remain Admin-only.</p>
                            <div className="flex flex-wrap gap-5">
                              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink"><input type="checkbox" checked={staffRevenueAccess} onChange={(event) => setStaffRevenueAccess(event.target.checked)} className="h-4 w-4 accent-[#66B159]" /> Revenue Management</label>
                              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink"><input type="checkbox" checked={staffOnboardingAccess} onChange={(event) => setStaffOnboardingAccess(event.target.checked)} className="h-4 w-4 accent-[#66B159]" /> OTA Onboarding</label>
                            </div>
                          </fieldset>

                          {message && <p className="mt-5 rounded-lg border border-[#66B159]/30 bg-[#66B159]/10 px-4 py-3 text-sm text-ink">{message}</p>}
                          {error && <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

                          <button
                            type="submit"
                            disabled={loading}
                            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-[#FFFCFC] transition-colors hover:bg-[#73bd66] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none sm:w-auto sm:px-6"
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                            Add employee
                          </button>
                        </form>
                      ) : (
                        <div className="surface rounded-lg">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 p-4 sm:px-6">
                            <div>
                              <p className="font-semibold text-ink">Employees</p>
                              <p className="mt-1 text-xs text-sub">{visibleStaffList.length} of {staffList.length} shown</p>
                            </div>
                            <label className="relative block">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost" />
                              <input value={staffSearch} onChange={(event) => setStaffSearch(event.target.value)} className="h-11 w-72 max-w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-sm text-ink placeholder:text-ghost focus:border-[#66B159] focus:outline-none" placeholder="Search employees" aria-label="Search employees" />
                            </label>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="border-b border-zinc-700 text-left">
                                <tr>
                                  <th className="px-6 py-4 font-medium text-sub">Name</th>
                                  <th className="px-6 py-4 font-medium text-sub">Employee ID</th>
                                  <th className="px-6 py-4 font-medium text-sub">Contact details</th>
                                  <th className="px-6 py-4 font-medium text-sub">Department</th>
                                  <th className="px-6 py-4 font-medium text-sub">Status</th>
                                  <th className="px-6 py-4 font-medium text-sub">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {loading ? (
                                  <tr>
                                     <td colSpan={6} className="py-10 text-center text-sub">
                                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                    </td>
                                  </tr>
                                ) : visibleStaffList.length === 0 ? (
                                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sub">No matching employees.</td></tr>
                                ) : (
                                  visibleStaffList.map((staff) => (
                                    <tr key={staff.id} className="border-b border-zinc-800 last:border-none">
                                      <td className="px-6 py-4">
                                        <p className="font-medium text-ink">{staff.name}</p>
                                        <p className="text-xs text-sub">{staff.email}</p>
                                       </td>
                                       <td className="px-6 py-4 text-sub">{staff.employeeId || 'N/A'}</td>
                                       <td className="px-6 py-4">
                                         <p className="text-sm text-ink">{staff.phone || 'Profile setup pending'}</p>
                                         <p className="mt-1 max-w-56 truncate text-xs text-sub">{staff.address || 'No address yet'}</p>
                                         {staff.emergencyContactName ? <p className="mt-1 max-w-56 truncate text-xs text-sub">Emergency: {staff.emergencyContactName} ({staff.emergencyContactPhone})</p> : null}
                                         {staff.details ? <p className="mt-1 max-w-56 truncate text-xs text-sub">{staff.details}</p> : null}
                                       </td>
                                       <td className="px-6 py-4 text-sub">
                                         <p>{staff.department || 'N/A'}</p>
                                         <p className="mt-1 text-xs text-ghost">{staff.role || 'Role not set'}</p>
                                         <div className="mt-2 flex max-w-52 flex-wrap gap-1">
                                           {staff.clientAccess?.revenueManagement ? <span className="rounded border border-[#66B159]/25 bg-[#66B159]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#66B159]">Revenue access</span> : null}
                                           {staff.clientAccess?.otaOnboarding ? <span className="rounded border border-[#66B159]/25 bg-[#66B159]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#66B159]">Onboarding access</span> : null}
                                           {!staff.clientAccess?.revenueManagement && !staff.clientAccess?.otaOnboarding ? <span className="text-[10px] text-ghost">Client view only</span> : null}
                                         </div>
                                       </td>
                                      <td className="px-6 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${staff.active ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-400'}`}>{staff.active ? 'Active' : 'Pending'}</span></td>
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                          {!staff.active ? <button type="button" onClick={() => setOfferStaff(staff)} className="h-8 w-8 flex items-center justify-center rounded-md text-sub hover:bg-[#66B159]/20 hover:text-[#66B159] transition-colors" aria-label={`Generate offer letter for ${staff.name}`} title="Generate offer letter"><FileText className="h-4 w-4" /></button> : null}
                                          {!staff.active ? <button type="button" onClick={() => activateAcknowledgedStaff(staff)} className="h-8 w-8 flex items-center justify-center rounded-md text-sub hover:bg-green-500/20 hover:text-green-400 transition-colors" aria-label={`Acknowledge offer and activate ${staff.name}`} title="Acknowledge & activate"><CheckCircle2 className="h-4 w-4" /></button> : null}
                                          <button type="button" onClick={() => setEditingStaff(staff)} className="h-8 w-8 flex items-center justify-center rounded-md text-sub hover:bg-zinc-800 hover:text-ink transition-colors" aria-label={`Edit ${staff.name}`} title="Edit employee"><Edit className="h-4 w-4" /></button>
                                          <button type="button" onClick={() => handleResetPassword(staff.id, staff.name)} className="h-8 w-8 flex items-center justify-center rounded-md text-sub hover:bg-amber-500/20 hover:text-amber-400 transition-colors" aria-label={`Reset password for ${staff.name}`} title="Reset password"><RefreshCw className="h-4 w-4" /></button>
                                          <button type="button" onClick={() => handleDeleteStaff(staff.id, staff.name, staff.email)} className="h-8 w-8 flex items-center justify-center rounded-md text-sub hover:bg-red-500/20 hover:text-red-400 transition-colors" aria-label={`Delete ${staff.name}`} title="Delete employee and records"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ),
                  properties: <ClientServicesPanel properties={propertyList} onboardings={onboardingList} loading={loading} onPropertiesChange={setPropertyList} onOnboardingsChange={setOnboardingList} />,
                  tasks: (
                    <div className="space-y-5">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <TaskMetric label="Working now" value={taskTodaySummary.working} detail="Active today" tone="green" />
                        <TaskMetric label="Completed today" value={taskTodaySummary.completed} detail="Work summaries submitted" tone="green" />
                        <TaskMetric label="Not started" value={taskTodaySummary.notStarted} detail="Active employees today" tone="amber" />
                      </div>
                      <div className="surface rounded-lg">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 p-6">
                          <div>
                            <p className="text-lg font-semibold text-ink">Daily Employee Summary</p>
                            <p className="mt-1 text-sm text-sub">Compact daily totals with expandable work details.</p>
                          </div>
                          <div className="flex flex-wrap items-end gap-2">
                            <label className="relative block"><span className="sr-only">Search employee</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost" /><input value={taskEmployeeSearch} onChange={(event) => setTaskEmployeeSearch(event.target.value)} className="h-10 w-56 max-w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-sm text-ink placeholder:text-ghost focus:border-[#66B159] focus:outline-none" placeholder="Search employee" aria-label="Search Tasks by employee name or email" /></label>
                            <label className="block w-44"><span className="sr-only">Filter by work date</span><DatePickerInput value={taskDateFilter} onChange={setTaskDateFilter} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none" /></label>
                            <label><span className="sr-only">Filter by status</span><select value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value as TaskStatusFilter)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none"><option value="all">All statuses</option><option value="working">Working</option><option value="completed">Completed</option><option value="not-started">Not started</option></select></label>
                            <label><span className="sr-only">Sort by duration</span><select value={taskDurationSort} onChange={(event) => setTaskDurationSort(event.target.value as TaskDurationSort)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none"><option value="recent">Newest first</option><option value="highest">Highest hours</option><option value="lowest">Lowest hours</option></select></label>
                            {taskEmployeeSearch || taskDateFilter || taskStatusFilter !== 'all' || taskDurationSort !== 'recent' ? <button type="button" onClick={() => { setTaskEmployeeSearch(''); setTaskDateFilter(''); setTaskStatusFilter('all'); setTaskDurationSort('recent') }} className="h-10 rounded-lg border border-zinc-700 px-3 text-sm font-medium text-sub transition-colors hover:text-ink">Clear filters</button> : null}
                            <button type="button" onClick={handleExportWorkingDays} className="flex h-10 items-center gap-2 rounded-lg bg-[#66B159] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#73bd66]" title="Export completed working days for the selected employee and date filters"><FileDown className="h-4 w-4" /> Export</button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[860px] text-sm">
                            <thead className="border-b border-zinc-700 text-left">
                              <tr>
                                <th className="w-12 px-4 py-4"><span className="sr-only">Expand</span></th>
                                <th className="px-4 py-4 font-medium text-sub">Employee</th>
                                <th className="px-4 py-4 font-medium text-sub">Date</th>
                                <th className="px-4 py-4 font-medium text-sub">Status</th>
                                <th className="px-4 py-4 font-medium text-sub">Duration</th>
                                <th className="px-4 py-4 font-medium text-sub">Summary</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loading ? (
                                <tr><td colSpan={6} className="py-10 text-center text-sub"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                              ) : dailyWorkSummaries.length === 0 ? (
                                <tr><td colSpan={6} className="py-10 text-center text-sub">{taskEmployeeSearch.trim() || taskDateFilter || taskStatusFilter !== 'all' ? 'No employee summaries match the selected filters.' : 'No work sessions recorded yet.'}</td></tr>
                              ) : (
                                dailyWorkSummaries.map((summary) => {
                                  const expanded = expandedTaskSummary === summary.key
                                  const firstNote = summary.sessions.find((session) => session.notes)?.notes
                                  return (
                                    <Fragment key={summary.key}>
                                      <tr className="border-b border-zinc-800">
                                        <td className="px-4 py-4">
                                          {summary.sessions.length ? <button type="button" onClick={() => setExpandedTaskSummary(expanded ? '' : summary.key)} className="flex h-8 w-8 items-center justify-center rounded-md text-sub transition-colors hover:bg-zinc-800 hover:text-ink" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${staffNameByEmail.get(summary.staffEmail) || summary.staffEmail} work details`}>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button> : null}
                                        </td>
                                        <td className="px-4 py-4"><p className="font-medium text-ink">{staffNameByEmail.get(summary.staffEmail) || summary.staffEmail}</p><p className="text-xs text-sub">{summary.staffEmail}</p></td>
                                        <td className="whitespace-nowrap px-4 py-4 text-sub">{formatDateOnlyDisplay(summary.workDate)}</td>
                                        <td className="px-4 py-4"><TaskSummaryStatus status={summary.status} /></td>
                                        <td className="whitespace-nowrap px-4 py-4 font-medium text-ink">{formatWorkDuration(summary.durationMinutes)}</td>
                                        <td className="max-w-sm px-4 py-4 text-sub"><p className="truncate">{firstNote || (summary.status === 'active' ? 'Work currently in progress.' : summary.status === 'not-started' ? 'Work has not been started.' : 'No summary recorded.')}</p></td>
                                      </tr>
                                      {expanded ? (
                                        <tr className="border-b border-zinc-800 bg-zinc-950/35">
                                          <td colSpan={6} className="px-6 py-5">
                                            <div className="space-y-3">
                                              {summary.sessions.map((session) => (
                                                <div key={session.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-sub">
                                                      <span>Start: <strong className="font-medium text-ink">{formatWorkTime(session.startedAt)}</strong></span>
                                                      <span>End: <strong className="font-medium text-ink">{session.endedAt ? formatWorkTime(session.endedAt) : 'In progress'}</strong></span>
                                                      <span>Duration: <strong className="font-medium text-ink">{formatWorkDuration(workSessionDurationMinutes(session, workClock))}</strong></span>
                                                    </div>
                                                    <button type="button" onClick={() => setCorrectingWorkSession(session)} className="flex h-8 items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 text-xs font-medium text-sub transition-colors hover:border-[#66B159]/50 hover:text-ink" title="Correct start or end time"><Edit className="h-3.5 w-3.5" /> Correct time</button>
                                                  </div>
                                                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-sub">{session.notes || (session.status === 'active' ? 'Work currently in progress.' : 'No work summary recorded.')}</p>
                                                </div>
                                              ))}
                                            </div>
                                          </td>
                                        </tr>
                                      ) : null}
                                    </Fragment>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ),
                  finance: <FinancePanel />,
                  expenses: (
                    <div className="space-y-6">
                      <form className="surface rounded-lg p-6 sm:p-7" onSubmit={submitExpense}>
                        <div className="mb-5">
                          <p className="text-lg font-semibold text-ink">Record Admin Expense</p>
                          <p className="mt-1 text-sm text-sub">Track company expenses directly. Admin entries are recorded as approved.</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <div><label htmlFor="adminExpenseName" className="label-upper mb-2 block text-ghost">Admin name</label><select id="adminExpenseName" value={adminExpenseName} onChange={(event) => setAdminExpenseName(event.target.value)} className={inputClass} required><option value="">Select Admin</option>{ADMIN_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
                          <div><label htmlFor="adminExpenseDate" className="label-upper mb-2 block text-ghost">Expense date</label><DatePickerInput id="adminExpenseDate" value={expenseDate} onChange={setExpenseDate} className={inputClass} required /></div>
                          <div><label htmlFor="adminExpenseType" className="label-upper mb-2 block text-ghost">Expense type</label><select id="adminExpenseType" value={expenseType} onChange={(event) => { const value = event.target.value as typeof expenseType; setExpenseType(value); if (value !== 'other') setCustomExpenseType('') }} className={inputClass}><option value="travel">Travel</option><option value="food">Food</option><option value="fuel">Fuel</option><option value="other">Other</option></select></div>
                          {expenseType === 'other' ? <div><label htmlFor="adminCustomExpenseType" className="label-upper mb-2 block text-ghost">Specify expense type</label><input id="adminCustomExpenseType" value={customExpenseType} onChange={(event) => setCustomExpenseType(event.target.value)} maxLength={100} className={inputClass} required /></div> : null}
                          <div><label htmlFor="adminExpenseAmount" className="label-upper mb-2 block text-ghost">Amount</label><input id="adminExpenseAmount" type="number" inputMode="decimal" min="0.01" step="0.01" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} className={inputClass} required /></div>
                          <div><label htmlFor="adminExpenseCity" className="label-upper mb-2 block text-ghost">City</label><input id="adminExpenseCity" value={expenseCity} onChange={(event) => setExpenseCity(event.target.value)} maxLength={100} className={inputClass} /></div>
                          <div><label htmlFor="adminExpenseReceipt" className="label-upper mb-2 block text-ghost">Receipt link (optional)</label><input id="adminExpenseReceipt" type="url" inputMode="url" value={expenseReceiptUrl} onChange={(event) => setExpenseReceiptUrl(event.target.value)} maxLength={2048} className={inputClass} placeholder="https://..." /></div>
                        </div>
                        <div className="mt-4"><label htmlFor="adminExpenseDescription" className="label-upper mb-2 block text-ghost">Description</label><textarea id="adminExpenseDescription" rows={2} value={expenseNotes} onChange={(event) => setExpenseNotes(event.target.value)} maxLength={2000} className={`${inputClass} h-auto resize-y py-3`} /></div>
                        {message ? <p className="mt-4 rounded-lg border border-[#66B159]/30 bg-[#66B159]/10 px-4 py-3 text-sm text-ink">{message}</p> : null}
                        {error ? <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
                        <button type="submit" disabled={loading} className="mt-5 flex h-11 items-center justify-center gap-2 rounded-lg bg-[#66B159] px-5 text-sm font-semibold text-white disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Record expense</button>
                      </form>

                      <div className="surface rounded-lg">
                        <div className="border-b border-zinc-800 p-6">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div><p className="text-lg font-semibold text-ink">{expenseTrackingView === 'admin' ? 'Admin Expenses' : 'Staff Expense Approvals'}</p><p className="mt-1 text-sm text-sub">{expenseTrackingView === 'admin' ? 'Review expenses recorded directly by Admin users.' : 'Review and decide employee expense claims.'}</p></div>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="rounded-lg border border-[#66B159]/25 bg-[#66B159]/10 px-4 py-2 text-right"><p className="text-[10px] font-semibold uppercase tracking-wider text-sub">{expensePersonSearch.trim() || expensePaymentFilter !== 'all' ? 'Filtered total' : 'Total amount'}</p><p className="mt-0.5 text-lg font-bold text-[#66B159]">₹{visibleTrackedExpenseTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p></div>
                              <button type="button" onClick={handleExportExpenses} className="flex h-10 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#73bd66]"><FileDown className="h-4 w-4" /> Export CSV</button>
                            </div>
                          </div>
                          <div className="mt-5 flex flex-wrap gap-2 rounded-lg border border-zinc-800 bg-zinc-950/30 p-1.5">
                            <button type="button" onClick={() => { setExpenseTrackingView('staff'); setExpensePersonSearch(''); setExpensePaymentFilter('all') }} className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${expenseTrackingView === 'staff' ? 'bg-[#66B159] text-white' : 'text-sub hover:bg-zinc-800 hover:text-ink'}`}>Staff Expenses</button>
                            <button type="button" onClick={() => { setExpenseTrackingView('admin'); setExpensePersonSearch(''); setExpensePaymentFilter('all') }} className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${expenseTrackingView === 'admin' ? 'bg-[#66B159] text-white' : 'text-sub hover:bg-zinc-800 hover:text-ink'}`}>Admin Expenses</button>
                            <label className="relative ml-auto min-w-64 flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost" /><input value={expensePersonSearch} onChange={(event) => setExpensePersonSearch(event.target.value)} className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-sm text-ink placeholder:text-ghost focus:border-[#66B159] focus:outline-none" placeholder={expenseTrackingView === 'admin' ? 'Search Admin name' : 'Search staff name'} aria-label={expenseTrackingView === 'admin' ? 'Search expenses by Admin name' : 'Search expenses by staff name'} /></label>
                            <select value={expensePaymentFilter} onChange={(event) => setExpensePaymentFilter(event.target.value as typeof expensePaymentFilter)} className="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none" aria-label="Filter expenses by payment status"><option value="all">All payment statuses</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select>
                          </div>
                        </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-zinc-700 text-left">
                            <tr>
                                  <th className="px-6 py-4 font-medium text-sub">{expenseTrackingView === 'admin' ? 'Recorded by' : 'Staff'}</th>
                                  <th className="px-6 py-4 font-medium text-sub">Expense date</th>
                                  <th className="px-6 py-4 font-medium text-sub">Claim</th>
                              <th className="px-6 py-4 font-medium text-sub">Amount</th>
                              {expenseTrackingView === 'staff' ? <th className="px-6 py-4 font-medium text-sub">Status</th> : null}
                              <th className="px-6 py-4 font-medium text-sub">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loading ? (
                              <tr><td colSpan={expenseTrackingView === 'admin' ? 5 : 6} className="py-10 text-center text-sub"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                            ) : visibleTrackedExpenses.length === 0 ? (
                              <tr><td colSpan={expenseTrackingView === 'admin' ? 5 : 6} className="py-10 text-center text-sub">{expensePersonSearch.trim() || expensePaymentFilter !== 'all' ? 'No expenses match the selected search and payment status.' : expenseTrackingView === 'admin' ? 'No Admin expenses recorded yet.' : 'No staff expenses submitted yet.'}</td></tr>
                            ) : (
                              visibleTrackedExpenses.map((expense) => (
                                <tr key={expense.id} className="border-b border-zinc-800 last:border-none">
                                  <td className="px-6 py-4">
                                    <p className="font-medium text-ink">{expense.staffName || expense.staffEmail}</p>
                                    <p className="text-xs text-sub">{expense.staffEmail}</p>
                                    {expense.submittedByRole === 'admin' ? <span className="mt-1 inline-block rounded border border-[#66B159]/25 bg-[#66B159]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#66B159]">Admin expense</span> : null}
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4 text-sub">{formatDateOnlyDisplay(expense.expenseDate) || 'Not recorded'}</td>
                                  <td className="px-6 py-4">
                                    <p className="font-medium capitalize text-ink">{expense.expenseType === 'other' ? expense.customExpenseType || 'Other' : expense.expenseType || expense.title}</p>
                                    <p className="mt-1 text-xs text-sub">{expense.city || 'No city'}{expense.description ? ` · ${expense.description}` : ''}</p>
                                    {expense.receiptUrl || expense.receiptDataUrl ? <a href={expense.receiptUrl || expense.receiptDataUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-[#66B159] hover:underline">View receipt</a> : <p className="mt-1 text-xs text-sub">No receipt reference</p>}
                                  </td>
                                  <td className="px-6 py-4 text-sub">₹{expense.amount.toLocaleString('en-IN')}</td>
                                  {expenseTrackingView === 'staff' ? <td className="px-6 py-4"><StatusBadge status={expense.status} />{expense.status === 'approved' ? <p className={`mt-1 text-xs font-medium ${expense.paymentStatus === 'paid' ? 'text-green-400' : 'text-amber-300'}`}>{expense.paymentStatus === 'paid' ? 'Reimbursement paid' : 'Reimbursement unpaid'}</p> : null}</td> : null}
                                  <td className="px-6 py-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {expense.paymentStatus !== 'paid' ? <button type="button" onClick={() => setCorrectingExpense(expense)} className="flex h-8 items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 text-xs font-medium text-sub transition-colors hover:border-[#66B159]/50 hover:text-ink" title="Correct expense details"><Edit className="h-3.5 w-3.5" /> Correct</button> : null}
                                      {expense.submittedByRole === 'admin' ? (
                                        <>
                                        {expense.paymentStatus !== 'paid' ? <button type="button" disabled={deletingExpenseId === expense.id} onClick={() => markExpenseReimbursed(expense)} className="flex h-8 items-center gap-1.5 rounded-md bg-[#66B159]/10 px-2.5 text-xs font-medium text-[#66B159] transition-colors hover:bg-[#66B159]/20 disabled:opacity-50" title="Mark expense paid">{deletingExpenseId === expense.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />} Mark paid</button> : <span className="text-xs font-medium text-green-400">Paid</span>}
                                        {expense.staffEmail.toLowerCase() === user.email.toLowerCase() ? <button type="button" disabled={deletingExpenseId === expense.id} onClick={() => withdrawAdminExpense(expense)} className="flex h-8 items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50" title="Withdraw Admin expense">{deletingExpenseId === expense.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Withdraw</button> : null}
                                        </>
                                    ) : expense.status === 'pending' ? (
                                      <>
                                        <button type="button" onClick={() => handleExpenseStatusUpdate(expense.id, 'approved')} className="flex h-8 items-center gap-1.5 rounded-md bg-green-500/10 px-2.5 text-xs text-green-400 transition-colors hover:bg-green-500/20"><CheckCircle2 className="h-3.5 w-3.5" />Approve</button>
                                        <button type="button" onClick={() => handleExpenseStatusUpdate(expense.id, 'rejected')} className="flex h-8 items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 text-xs text-red-400 transition-colors hover:bg-red-500/20"><XCircle className="h-3.5 w-3.5" />Reject</button>
                                      </>
                                    ) : expense.status === 'approved' && expense.paymentStatus !== 'paid' ? (
                                      <button type="button" disabled={deletingExpenseId === expense.id} onClick={() => markExpenseReimbursed(expense)} className="flex h-8 items-center gap-1.5 rounded-md bg-[#66B159]/10 px-2.5 text-xs font-medium text-[#66B159] transition-colors hover:bg-[#66B159]/20 disabled:opacity-50" title="Mark reimbursement paid">{deletingExpenseId === expense.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />} Mark paid</button>
                                    ) : null}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      </div>
                    </div>
                  ),
                  leaves: (
                    <div className="surface rounded-lg">
                      <div className="border-b border-zinc-800 p-6"><p className="text-lg font-semibold text-ink">Leave Requests</p><p className="mt-1 text-sm text-sub">Review employee leave requests.</p></div>
                      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-zinc-700 text-left"><tr><th className="px-6 py-4 font-medium text-sub">Employee</th><th className="px-6 py-4 font-medium text-sub">Dates</th><th className="px-6 py-4 font-medium text-sub">Reason</th><th className="px-6 py-4 font-medium text-sub">Status</th><th className="px-6 py-4 font-medium text-sub">Actions</th></tr></thead><tbody>{leaveList.map((leave) => <tr key={leave.id} className="border-b border-zinc-800 last:border-none"><td className="px-6 py-4 text-ink">{leave.staffEmail}</td><td className="px-6 py-4 text-sub"><LeaveDateSummary leave={leave} /></td><td className="px-6 py-4 text-sub">{leave.reason}</td><td className="px-6 py-4"><StatusBadge status={leave.status} />{leave.decisionNote ? <p className="mt-1 text-xs text-sub">{leave.decisionNote}</p> : null}</td><td className="px-6 py-4">{leave.status === 'pending' ? <div className="flex gap-2"><button onClick={() => updateLeaveStatus(leave.id, 'approved')} className="text-sm text-green-400">Approve</button><button onClick={() => updateLeaveStatus(leave.id, 'rejected')} className="text-sm text-red-400">Reject</button></div> : null}</td></tr>)}</tbody></table></div>
                    </div>
                  ),
                  payroll: (
                    <div className="surface rounded-lg">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 p-6">
                        <div>
                          <p className="text-lg font-semibold text-ink">Payroll Processing</p>
                          <p className="mt-1 text-sm text-sub">Monthly salary is paid in full. Completed work sessions are shown for reference only.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm text-sub transition-colors hover:bg-zinc-800">
                            Current month
                          </button>
                          <button type="button" onClick={handleExportPayroll} className="flex h-10 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-[#FFFCFC] transition-colors hover:bg-[#73bd66]">
                            <FileDown className="h-4 w-4" />
                            Export CSV
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-zinc-700 text-left">
                            <tr>
                              <th className="px-6 py-4 font-medium text-sub">Employee</th>
                              <th className="px-6 py-4 font-medium text-sub">Department</th>
                              <th className="px-6 py-4 font-medium text-sub">Salary</th>
                              <th className="px-6 py-4 font-medium text-sub">Completed work days</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payrollRows.length === 0 ? (
                              <tr><td colSpan={4} className="py-10 text-center text-sub">No employee payroll records available yet.</td></tr>
                            ) : payrollRows.map((p) => (
                              <tr key={p.employeeId} className="border-b border-zinc-800 last:border-none">
                                <td className="px-6 py-4">
                                  <p className="font-medium text-ink">{p.employeeName}</p>
                                  <p className="text-xs text-sub">{p.employeeId}</p>
                                </td>
                                <td className="px-6 py-4 text-sub">{p.department}</td>
                                <td className="px-6 py-4 text-sub">₹{p.monthlySalary.toLocaleString('en-IN')}</td>
                                <td className="px-6 py-4 text-sub">{p.completedWorkDays}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ),
                  settings: (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                      {message && <p className="lg:col-span-2 rounded-lg border border-[#66B159]/30 bg-[#66B159]/10 px-4 py-3 text-sm text-ink">{message}</p>}
                      {error && <p className="lg:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

                      <div className="surface rounded-lg p-6 sm:p-7">
                        <p className="text-base font-semibold text-ink">Expense Claim Fields</p>
                        <p className="mt-2 text-sm leading-6 text-sub">Choose which fields employees must complete when submitting an expense.</p>
                        <div className="mt-5 space-y-3">
                          {([['cityRequired', 'City'], ['descriptionRequired', 'Description'], ['receiptRequired', 'Receipt link']] as const).map(([field, label]) => (
                            <label key={field} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-ink">
                              {label}
                              <input type="checkbox" checked={expenseSettings[field]} onChange={(event) => setExpenseSettings((current) => ({ ...current, [field]: event.target.checked }))} className="h-4 w-4 accent-[#66B159]" />
                            </label>
                          ))}
                        </div>
                        <button type="button" onClick={saveExpenseSettings} disabled={loading} className="mt-5 flex h-10 items-center justify-center rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:opacity-60">Save expense fields</button>
                      </div>

                      <form className="surface rounded-lg p-6 sm:p-7" onSubmit={changeAdminPassword}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#66B159]/10 text-[#66B159]"><KeyRound className="h-5 w-5" /></div>
                          <div><p className="text-base font-semibold text-ink">Change admin password</p><p className="mt-1 text-sm text-sub">Use at least {securitySettings.minPasswordLength} characters.</p></div>
                        </div>
                        <div className="mt-5 space-y-4">
                          <div><label htmlFor="adminCurrentPassword" className="label-upper mb-2 block text-ghost">Current password</label><input id="adminCurrentPassword" type="password" value={adminCurrentPassword} onChange={(event) => setAdminCurrentPassword(event.target.value)} className={inputClass} required /></div>
                          <div><label htmlFor="adminNewPassword" className="label-upper mb-2 block text-ghost">New password</label><input id="adminNewPassword" type="password" minLength={securitySettings.minPasswordLength} value={adminNewPassword} onChange={(event) => setAdminNewPassword(event.target.value)} className={inputClass} required /></div>
                          <div><label htmlFor="adminConfirmPassword" className="label-upper mb-2 block text-ghost">Confirm new password</label><input id="adminConfirmPassword" type="password" minLength={securitySettings.minPasswordLength} value={adminConfirmPassword} onChange={(event) => setAdminConfirmPassword(event.target.value)} className={inputClass} required /></div>
                        </div>
                        <button type="submit" disabled={loading} className="mt-5 flex h-10 items-center justify-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Update password</button>
                      </form>

                      <div className="surface rounded-lg p-6 sm:p-7">
                        <p className="text-base font-semibold text-ink">Security Policy</p>
                        <div className="mt-5 space-y-4">
                          <div><label htmlFor="sessionHours" className="label-upper mb-2 block text-ghost">Session duration</label><select id="sessionHours" value={securitySettings.sessionHours} onChange={(event) => setSecuritySettings((current) => ({ ...current, sessionHours: Number(event.target.value) as SecuritySettings['sessionHours'] }))} className={inputClass}>{[1, 4, 8, 12, 24].map((hours) => <option key={hours} value={hours}>{hours} hour{hours === 1 ? '' : 's'}</option>)}</select></div>
                          <div><label htmlFor="minPasswordLength" className="label-upper mb-2 block text-ghost">Minimum password length</label><input id="minPasswordLength" type="number" min="8" max="64" value={securitySettings.minPasswordLength} onChange={(event) => setSecuritySettings((current) => ({ ...current, minPasswordLength: Number(event.target.value) || 8 }))} className={inputClass} /></div>
                          {([['requireUppercase', 'Require uppercase letter'], ['requireNumber', 'Require number']] as const).map(([field, label]) => <label key={field} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-ink">{label}<input type="checkbox" checked={securitySettings[field]} onChange={(event) => setSecuritySettings((current) => ({ ...current, [field]: event.target.checked }))} className="h-4 w-4 accent-[#66B159]" /></label>)}
                        </div>
                        <button type="button" onClick={saveSecuritySettings} disabled={loading} className="mt-5 flex h-10 items-center justify-center rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:opacity-60">Save security policy</button>
                      </div>

                      <div className="surface rounded-lg p-6 sm:p-7">
                        <p className="text-base font-semibold text-ink">Audit Logs</p>
                        <p className="mt-2 text-sm leading-6 text-sub">
                          Remove existing audit records now. A fresh record is written after the clear action.
                        </p>
                        <button
                          type="button"
                          onClick={clearAuditLogs}
                          disabled={loading}
                          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                          Clear audit logs
                        </button>
                      </div>
                    </div>
                  ),
                }[activeTab]
              : user.mustChangePassword ? (
                <form className="surface rounded-lg p-6 sm:p-7" onSubmit={changePassword}>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#66B159]/10 text-[#66B159]">
                      <KeyRound className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-ink">Change your initial password</p>
                      <p className="mt-1 text-sm text-sub">Set your password and complete your contact profile to continue.</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="currentPassword" className="label-upper mb-2 block text-ghost">
                        Current password
                      </label>
                      <div className="relative">
                        <input
                          id="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                          className={`${inputClass} pr-12`}
                          placeholder="Temporary password"
                          required
                        />
                        <button type="button" onClick={() => setShowCurrentPassword((visible) => !visible)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ghost transition-colors hover:bg-zinc-800 hover:text-ink" aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}>
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="label-upper mb-2 block text-ghost">
                        New password
                      </label>
                      <div className="relative">
                        <input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          className={`${inputClass} pr-12`}
                          placeholder={`At least ${securitySettings.minPasswordLength} characters`}
                          minLength={securitySettings.minPasswordLength}
                          required
                        />
                        <button type="button" onClick={() => setShowNewPassword((visible) => !visible)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ghost transition-colors hover:bg-zinc-800 hover:text-ink" aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}>
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-sub">
                        Use at least {securitySettings.minPasswordLength} characters
                        {securitySettings.requireUppercase ? ', including an uppercase letter' : ''}
                        {securitySettings.requireNumber ? ', including a number' : ''}.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="profilePhone" className="label-upper mb-2 block text-ghost">Phone number</label>
                      <input id="profilePhone" type="tel" inputMode="numeric" pattern="[0-9]{7,15}" maxLength={15} value={profilePhone} onChange={(event) => setProfilePhone(event.target.value.replace(/\D/g, ''))} className={inputClass} placeholder="Digits only" required />
                    </div>
                    <div>
                      <label htmlFor="profileAddress" className="label-upper mb-2 block text-ghost">Address</label>
                      <input id="profileAddress" value={profileAddress} onChange={(event) => setProfileAddress(event.target.value)} className={inputClass} placeholder="Your current address" required />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="emergencyContactName" className="label-upper mb-2 block text-ghost">Emergency contact name</label>
                      <input id="emergencyContactName" value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value.replace(/\d/g, ''))} className={inputClass} placeholder="Name of emergency contact" required />
                    </div>
                    <div>
                      <label htmlFor="emergencyContactPhone" className="label-upper mb-2 block text-ghost">Emergency contact phone</label>
                      <input id="emergencyContactPhone" type="tel" inputMode="numeric" pattern="[0-9]{7,15}" maxLength={15} value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value.replace(/\D/g, ''))} className={inputClass} placeholder="Digits only" required />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="profileDetails" className="label-upper mb-2 block text-ghost">Additional details</label>
                    <textarea id="profileDetails" rows={3} value={profileDetails} onChange={(event) => setProfileDetails(event.target.value)} className={`${inputClass} h-auto resize-none py-3`} placeholder="Optional role details or other relevant information" />
                  </div>

                  {message && <p className="mt-5 rounded-lg border border-[#66B159]/30 bg-[#66B159]/10 px-4 py-3 text-sm text-ink">{message}</p>}
                  {error && <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-[#FFFCFC] transition-colors hover:bg-[#73bd66] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none sm:w-auto sm:px-6"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Complete profile
                  </button>
                </form>
              ) : {
                  dashboard: (
                    <div className="staff-dashboard space-y-6">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <DashboardMetric icon={<Clock3 className="h-5 w-5" />} label="Work timer" value={dashboardActiveWorkSessions ? 'Running' : 'Not started'} detail="Today’s task session" />
                        <DashboardMetric icon={<ReceiptText className="h-5 w-5" />} label="Pending expenses" value={dashboardPendingExpenses} detail="Waiting for admin review" />
                        <DashboardMetric icon={<CheckCircle2 className="h-5 w-5" />} label="Approved expenses" value={`Rs. ${dashboardApprovedExpenseTotal.toLocaleString('en-IN')}`} detail="Reimbursable total approved" />
                      </div>
                      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
                        <div className="surface rounded-lg p-6 sm:p-7">
                          <div className="flex items-center justify-between gap-4">
                            <div><p className="text-lg font-semibold text-ink">Recent activity</p><p className="mt-1 text-sm text-sub">Your latest submissions and decisions.</p></div>
                          </div>
                          <div className="mt-5 divide-y divide-zinc-200">
                            {loading ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-[#4d9144]" /></div> : recentActivity.length === 0 ? <p className="py-8 text-sm text-sub">No activity yet. Start work or submit an expense.</p> : recentActivity.map((item, index) => <div key={`${item.type}-${index}`} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-medium text-ink">{item.type}: {item.title}</p><p className="mt-1 text-xs text-sub">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently submitted'}</p></div><StatusBadge status={item.status} /></div>)}
                          </div>
                        </div>
                        <div className="surface rounded-lg p-6 sm:p-7">
                          <p className="text-lg font-semibold text-ink">Submit work</p>
                          <p className="mt-1 text-sm leading-6 text-sub">Send your records for admin approval.</p>
                          <div className="mt-5 grid gap-3">
                            <button type="button" onClick={() => setActiveTab('tasks')} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-[#66B159]">Open today’s tasks <Clock3 className="h-4 w-4 text-[#4d9144]" /></button>
                            <button type="button" onClick={() => setActiveTab('expenses')} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-[#66B159]">Submit expense <ReceiptText className="h-4 w-4 text-[#4d9144]" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                  properties: <ClientServicesPanel properties={propertyList} onboardings={onboardingList} loading={loading} onPropertiesChange={setPropertyList} onOnboardingsChange={setOnboardingList} readOnly revenueEditor={user.clientAccess?.revenueManagement === true} onboardingEditor={user.clientAccess?.otaOnboarding === true} />,
                  expenses: (
                    <div className="staff-workspace space-y-6 text-left">
                      <form className="staff-work-card rounded-lg p-6 sm:p-7" onSubmit={submitExpense}>
                        <div className="mb-6">
                          <p className="text-lg font-semibold text-ink">Submit Expense</p>
                          <p className="mt-1 text-sm text-sub">Expenses are sent to admin as pending approvals.</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="expenseDate" className="label-upper mb-2 block text-ghost">Expense date</label>
                            <DatePickerInput id="expenseDate" value={expenseDate} onChange={setExpenseDate} className={inputClass} required />
                          </div>
                          <div>
                            <label htmlFor="expenseCity" className="label-upper mb-2 block text-ghost">
                              City{expenseSettings.cityRequired ? ' *' : ''}
                            </label>
                            <input id="expenseCity" value={expenseCity} onChange={(event) => setExpenseCity(event.target.value)} className={inputClass} required={expenseSettings.cityRequired} />
                          </div>
                          <div>
                            <label htmlFor="expenseType" className="label-upper mb-2 block text-ghost">Expense type</label>
                            <select id="expenseType" value={expenseType} onChange={(event) => { const value = event.target.value as typeof expenseType; setExpenseType(value); if (value !== 'other') setCustomExpenseType('') }} className={inputClass}>
                              <option value="travel">Travel</option><option value="food">Food</option><option value="fuel">Fuel</option><option value="other">Other</option>
                            </select>
                          </div>
                          {expenseType === 'other' ? <div><label htmlFor="customExpenseType" className="label-upper mb-2 block text-ghost">Specify expense type</label><input id="customExpenseType" value={customExpenseType} onChange={(event) => setCustomExpenseType(event.target.value)} maxLength={100} className={inputClass} required /></div> : null}
                          <div>
                            <label htmlFor="expenseAmount" className="label-upper mb-2 block text-ghost">
                              Total expense
                            </label>
                            <input id="expenseAmount" type="number" inputMode="decimal" min="0.01" step="0.01" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} className={inputClass} required />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label htmlFor="expenseNotes" className="label-upper mb-2 block text-ghost">
                            Description{expenseSettings.descriptionRequired ? ' *' : ''}
                          </label>
                          <textarea
                            id="expenseNotes"
                            rows={3}
                            value={expenseNotes}
                            onChange={(event) => setExpenseNotes(event.target.value)}
                            className={`${inputClass} h-auto resize-none py-3`}
                            required={expenseSettings.descriptionRequired}
                          />
                        </div>
                        <div className="mt-4">
                          <label htmlFor="expenseReceipt" className="label-upper mb-2 block text-ghost">Receipt link{expenseSettings.receiptRequired ? ' *' : ''}</label>
                          <input id="expenseReceipt" type="url" inputMode="url" value={expenseReceiptUrl} required={expenseSettings.receiptRequired} onChange={(event) => setExpenseReceiptUrl(event.target.value)} className={inputClass} placeholder="Google Drive or receipt reference URL" />
                          <p className="mt-2 text-xs text-sub">Use a shareable Drive link or other secure receipt URL.</p>
                        </div>

                        {message && <p className="mt-5 rounded-lg border border-[#66B159]/30 bg-[#66B159]/10 px-4 py-3 text-sm text-ink">{message}</p>}
                        {error && <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

                        <button
                          type="submit"
                          disabled={loading}
                          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-[#FFFCFC] transition-colors hover:bg-[#73bd66] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                          Submit expense
                        </button>
                      </form>

                      <div className="staff-work-card rounded-lg">
                        <div className="border-b border-zinc-800 p-6">
                          <p className="text-lg font-semibold text-ink">My Expenses</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="border-b border-zinc-700 text-left">
                              <tr>
                                <th className="px-6 py-4 font-medium text-sub">Expense</th>
                                <th className="px-6 py-4 font-medium text-sub">Expense date</th>
                                <th className="px-6 py-4 font-medium text-sub">Amount</th>
                                <th className="px-6 py-4 font-medium text-sub">Status</th>
                                <th className="px-6 py-4 font-medium text-sub">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loading ? (
                                <tr><td colSpan={5} className="py-10 text-center text-sub"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                              ) : expenseList.length === 0 ? (
                                <tr><td colSpan={5} className="py-10 text-center text-sub">No expenses submitted yet.</td></tr>
                              ) : (
                                expenseList.map((expense) => (
                                  <tr key={expense.id} className="border-b border-zinc-800 last:border-none">
                                    <td className="px-6 py-4">
                                      <p className="font-medium text-ink">{expense.expenseType === 'other' ? expense.customExpenseType || 'Other' : expense.expenseType}</p>
                                      <p className="text-xs text-sub">{expense.city || 'No city'}{expense.receiptName ? ' · Receipt submitted' : ''}</p>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sub">{formatDateOnlyDisplay(expense.expenseDate) || 'Not recorded'}</td>
                                    <td className="px-6 py-4 text-sub">₹{expense.amount.toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4"><StatusBadge status={expense.status} />{expense.status === 'approved' ? <p className={`mt-1 text-xs font-medium ${expense.paymentStatus === 'paid' ? 'text-green-400' : 'text-amber-300'}`}>{expense.paymentStatus === 'paid' ? 'Reimbursement paid' : 'Reimbursement pending'}</p> : null}{expense.decisionNote ? <p className="mt-1 max-w-48 text-xs text-sub">{expense.decisionNote}</p> : null}{expense.approvedAt || expense.rejectedAt ? <p className="mt-1 text-xs text-sub">{new Date(expense.approvedAt || expense.rejectedAt || '').toLocaleDateString('en-IN')}</p> : null}</td>
                                    <td className="px-6 py-4">{expense.status === 'pending' ? <button type="button" disabled={deletingExpenseId === expense.id} onClick={() => withdrawExpense(expense)} className="flex h-8 items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50" title="Withdraw expense">{deletingExpenseId === expense.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Withdraw</button> : <span className="text-xs text-ghost">Locked</span>}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ),
                  tasks: (
                    <div className="staff-workspace space-y-6 text-left">
                      <section className="staff-work-card rounded-lg p-6 sm:p-7">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div><p className="text-lg font-semibold text-ink">Today’s Task & Work Time</p><p className="mt-1 text-sm text-sub">{formatDateOnlyDisplay(todayLocalDateOnly())}</p></div>
                          {activeWorkSession ? <div className="rounded-lg border border-[#66B159]/30 bg-[#66B159]/10 px-4 py-2 text-right"><p className="text-xs font-semibold uppercase tracking-wider text-sub">Work time</p><p className="mt-1 text-xl font-bold text-[#66B159]">{formatLiveWorkDuration(activeWorkSession.startedAt, workClock)}</p></div> : null}
                        </div>

                        {loading ? <div className="flex min-h-36 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-sub" /></div> : activeWorkSession ? (
                          <div className="mt-6">
                            <div className="flex items-center gap-3 rounded-lg border border-[#66B159]/25 bg-[#66B159]/10 px-4 py-3"><span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#66B159] opacity-50" /><span className="relative inline-flex h-3 w-3 rounded-full bg-[#66B159]" /></span><div><p className="font-semibold text-ink">Work in progress</p><p className="text-xs text-sub">Started at {formatWorkTime(activeWorkSession.startedAt)}</p></div></div>
                            <label className="mt-5 block"><span className="label-upper mb-2 block text-ghost">Today’s work summary</span><textarea rows={5} value={workNotes} onChange={(event) => setWorkNotes(event.target.value)} maxLength={2000} className={`${inputClass} h-auto resize-y py-3`} placeholder="Example: Completed 45 calls. 8 clients were interested, 3 follow-ups were scheduled, and 1 client was converted. Add any onboarding or other tasks completed today." required /></label>
                            <p className="mt-2 text-xs text-sub">Add the work completed, calls made, interested leads, conversions, follow-ups, or onboarding progress.</p>
                            <button type="button" onClick={() => void endWork(activeWorkSession)} disabled={workActionLoading || workNotes.trim().length < 3} className="mt-5 flex h-12 items-center gap-2 rounded-lg bg-red-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50">{workActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4 fill-current" />} End work & save summary</button>
                          </div>
                        ) : todayCompletedSession ? (
                          <div className="mt-6 rounded-lg border border-green-500/25 bg-green-500/10 p-5"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-400" /><div><p className="font-semibold text-ink">Today’s work is completed</p><p className="mt-1 text-sm text-sub">{formatWorkTime(todayCompletedSession.startedAt)} – {todayCompletedSession.endedAt ? formatWorkTime(todayCompletedSession.endedAt) : ''} · {formatWorkDuration(todayCompletedSession.durationMinutes)}</p></div></div><p className="mt-4 text-sm leading-6 text-sub">{todayCompletedSession.notes}</p></div>
                        ) : (
                          <div className="mt-6"><p className="max-w-2xl text-sm leading-6 text-sub">Start the timer when you begin today’s work. After starting, the End Work option will appear and a work summary will be required before finishing.</p><button type="button" onClick={() => void startWork()} disabled={workActionLoading} className="mt-5 flex h-12 items-center gap-2 rounded-lg bg-[#66B159] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#73bd66] disabled:opacity-50">{workActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />} Start work</button></div>
                        )}
                        {message ? <p className="mt-5 rounded-lg border border-[#66B159]/30 bg-[#66B159]/10 px-4 py-3 text-sm text-ink">{message}</p> : null}
                        {error ? <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
                      </section>

                      <div className="staff-work-card rounded-lg">
                        <div className="border-b border-zinc-800 p-6">
                          <p className="text-lg font-semibold text-ink">My Work Log</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[760px] text-sm">
                            <thead className="border-b border-zinc-700 text-left">
                              <tr>
                                <th className="px-6 py-4 font-medium text-sub">Date</th>
                                <th className="px-6 py-4 font-medium text-sub">Start</th>
                                <th className="px-6 py-4 font-medium text-sub">End</th>
                                <th className="px-6 py-4 font-medium text-sub">Duration</th>
                                <th className="px-6 py-4 font-medium text-sub">Status</th>
                                <th className="px-6 py-4 font-medium text-sub">Work summary</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loading ? (
                                <tr><td colSpan={6} className="py-10 text-center text-sub"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                              ) : workSessionList.length === 0 ? (
                                <tr><td colSpan={6} className="py-10 text-center text-sub">No work sessions recorded yet.</td></tr>
                              ) : (
                                workSessionList.map((session) => (
                                  <tr key={session.id} className="border-b border-zinc-800 last:border-none">
                                    <td className="whitespace-nowrap px-6 py-4 font-medium text-ink">{formatDateOnlyDisplay(session.workDate)}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sub">{formatWorkTime(session.startedAt)}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sub">{session.endedAt ? formatWorkTime(session.endedAt) : 'In progress'}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sub">{session.status === 'active' ? formatLiveWorkDuration(session.startedAt, workClock) : formatWorkDuration(session.durationMinutes)}</td>
                                    <td className="px-6 py-4"><WorkSessionStatus status={session.status} /></td>
                                    <td className="max-w-md px-6 py-4 text-sub">{session.notes || 'Work currently in progress.'}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ),
                  leaves: (
                    <div className="staff-workspace space-y-6 text-left">
                      <form className="staff-work-card rounded-lg p-6 sm:p-7" onSubmit={submitLeaveRequest}><p className="text-lg font-semibold text-ink">Request Leave</p><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><label className="label-upper mb-2 block text-ghost">Leave type</label><select value={leaveType} onChange={(event) => setLeaveType(event.target.value as LeaveType)} className={inputClass}><option value="sick">Sick leave</option><option value="flexi">Flexi leave</option></select></div><div><label className="label-upper mb-2 block text-ghost">Start date</label><DatePickerInput value={leaveStartDate} onChange={setLeaveStartDate} className={inputClass} required /></div><div><label className="label-upper mb-2 block text-ghost">End date</label><DatePickerInput value={leaveEndDate} onChange={setLeaveEndDate} className={inputClass} min={leaveStartDate || undefined} required /></div></div><div className={`mt-3 rounded-lg border px-4 py-3 text-sm ${exceedsLeaveBalance ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-zinc-700 bg-zinc-900/60 text-sub'}`}><p>{leaveTypeLabel(leaveType)} allowance for {selectedLeaveYear}: {remainingLeaveDays} of {LEAVE_ALLOWANCES[leaveType]} days remaining.</p>{requestedLeaveDays > 0 ? <p className="mt-1 font-medium">Selected duration: {requestedLeaveDays} {requestedLeaveDays === 1 ? 'day' : 'days'}{exceedsLeaveBalance ? ' — exceeds available balance' : ''}</p> : null}</div><div className="mt-4"><label className="label-upper mb-2 block text-ghost">Reason</label><textarea value={leaveReason} onChange={(event) => setLeaveReason(event.target.value)} className={`${inputClass} h-auto resize-none py-3`} rows={3} required /></div><button type="submit" disabled={requestedLeaveDays < 1 || exceedsLeaveBalance} className="mt-5 h-11 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Submit leave request</button></form>
                      <div className="staff-work-card rounded-lg"><div className="border-b border-zinc-800 p-6"><p className="text-lg font-semibold text-ink">My Leave Requests</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-zinc-700 text-left"><tr><th className="px-6 py-4 font-medium text-sub">Dates</th><th className="px-6 py-4 font-medium text-sub">Reason</th><th className="px-6 py-4 font-medium text-sub">Status</th><th className="px-6 py-4 font-medium text-sub">Actions</th></tr></thead><tbody>{leaveList.map((leave) => <tr key={leave.id} className="border-b border-zinc-800"><td className="px-6 py-4 text-ink"><LeaveDateSummary leave={leave} /></td><td className="px-6 py-4 text-sub">{leave.reason}</td><td className="px-6 py-4"><StatusBadge status={leave.status} />{leave.decisionNote ? <p className="mt-1 text-xs text-sub">{leave.decisionNote}</p> : null}</td><td className="px-6 py-4">{leave.status === 'pending' ? <button type="button" disabled={deletingLeaveId === leave.id} onClick={() => withdrawLeaveRequest(leave)} className="flex h-8 items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50" title="Withdraw leave request">{deletingLeaveId === leave.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Withdraw</button> : <span className="text-xs text-ghost">Locked</span>}</td></tr>)}</tbody></table></div></div>
                    </div>
                  ),
                }[activeTab]}
          </div>
        </div>
      </section>

      <footer className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-6 text-center text-xs text-zinc-600 sm:px-10">
        {getVersionLabel(version)}
      </footer>

      {editingStaff && (
        <EditStaffModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSave={(updatedStaff) => {
            setStaffList(staffList.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)))
            setEditingStaff(null)
          }}
        />
      )}
      {offerStaff ? <OfferLetterModal staff={offerStaff} onClose={() => setOfferStaff(null)} /> : null}
      {correctingWorkSession ? (
        <WorkSessionCorrectionModal
          session={correctingWorkSession}
          employeeName={staffNameByEmail.get(correctingWorkSession.staffEmail) || correctingWorkSession.staffEmail}
          onClose={() => setCorrectingWorkSession(null)}
          onSaved={(updatedSession) => {
            setWorkSessionList((current) => current.map((session) => session.id === updatedSession.id ? updatedSession : session))
            setCorrectingWorkSession(null)
            setMessage('Work-session time corrected and added to the audit log.')
          }}
        />
      ) : null}
      {correctingExpense ? (
        <ExpenseCorrectionModal
          expense={correctingExpense}
          onClose={() => setCorrectingExpense(null)}
          onSaved={(updatedExpense) => {
            setExpenseList((current) => current.map((expense) => expense.id === updatedExpense.id ? updatedExpense : expense))
            setCorrectingExpense(null)
            setMessage('Expense corrected and added to the audit log.')
          }}
        />
      ) : null}
    </main>
  )
}

function getOfferRoleContent(roleValue: string, departmentValue: string) {
  const role = roleValue.toLowerCase()
  const department = departmentValue.toLowerCase()
  if (/telemarketing|telemarketer|telecaller|tele-caller|telesales|tele sales/.test(role)) return {
    summary: 'In this role, you will support business growth through professional telecalling, lead qualification, consistent prospect follow-ups, and accurate coordination with the sales team. You will represent ProfitPro clearly and courteously while introducing our services to potential hotel clients.',
    responsibilities: ['Make outbound telecalls to prospective hotel owners, managers, and other qualified leads.', 'Introduce ProfitPro services clearly, understand prospect requirements, and qualify sales opportunities.', 'Schedule appointments or product discussions for the business development team and share complete lead context.', 'Follow up with interested prospects through approved calling and messaging channels within agreed timelines.', 'Maintain accurate call logs, lead status, notes, and next actions in the designated CRM or tracker.', 'Work toward assigned calling, lead-generation, appointment, and conversion targets while submitting regular performance reports.', 'Support OTA onboarding by collecting required property details and documents, coordinating platform setup, tracking pending actions, and helping selected OTA listings go live.'],
  }
  if (/business development|business developement|sales|bdm/.test(`${role} ${department}`)) return {
    summary: 'In this role, you will report to the Head of Business Development and/or the Managing Director. Your primary responsibility is to promote and expand our hotel revenue management services by identifying business opportunities, conducting lead-generation activities, building strong client relationships, and driving sustainable revenue growth.',
    responsibilities: ['Identify and acquire new hotel clients.', "Present, promote, and market ProfitPro's hotel revenue management solutions.", 'Develop and maintain long-term relationships with hotel owners and management teams.', 'Work toward monthly and quarterly sales targets while monitoring market and competitor activity.', 'Coordinate with revenue management and operations teams to ensure smooth client onboarding.'],
  }
  if (/revenue|pricing|yield/.test(`${role} ${department}`)) return {
    summary: 'In this role, you will support hotel revenue performance through disciplined pricing, forecasting, inventory controls, market intelligence, and close collaboration with clients and internal teams.',
    responsibilities: ['Review daily pickup, occupancy, demand, and market conditions.', 'Recommend and implement pricing and inventory strategies across relevant channels.', 'Monitor competitor pricing, events, forecasts, ADR, RevPAR, and revenue trends.', 'Prepare clear performance reports and communicate actions to hotel stakeholders.', 'Coordinate with onboarding and operations teams to maintain accurate rates, availability, and restrictions.'],
  }
  if (/onboarding|ota|distribution/.test(`${role} ${department}`)) return {
    summary: 'In this role, you will manage accurate and timely onboarding of hotel properties across selected online travel platforms, ensuring that listings, content, policies, rates, and inventory are ready for sale.',
    responsibilities: ['Create and configure OTA accounts and property listings.', 'Collect, verify, and securely manage onboarding documents and credentials.', 'Upload accurate property content, room details, policies, images, rates, and inventory.', 'Track platform verification and resolve pending setup requirements.', 'Coordinate with clients and internal teams until every selected platform is live.'],
  }
  if (/operation|customer success|client service|support/.test(`${role} ${department}`)) return {
    summary: 'In this role, you will help deliver reliable day-to-day client operations, maintain service quality, coordinate internal actions, and ensure that client requests are resolved with clarity and ownership.',
    responsibilities: ['Coordinate daily client requests and internal follow-ups.', 'Maintain accurate operational records, trackers, and service documentation.', 'Monitor open actions and escalate risks or delays promptly.', 'Support consistent communication with hotel stakeholders.', 'Work across teams to improve service quality and turnaround time.'],
  }
  return {
    summary: `In this role, you will contribute to the ${departmentValue || 'assigned'} function, carry out the responsibilities associated with the position of ${roleValue || 'your assigned role'}, and collaborate with your manager and colleagues to deliver high-quality outcomes for ProfitPro and its clients.`,
    responsibilities: ['Perform the responsibilities assigned to the role with care, accuracy, and professional judgment.', 'Maintain timely communication and reliable records for assigned work.', 'Collaborate with colleagues and client-facing teams to meet agreed objectives.', 'Protect Company and client information and follow all approved processes.', 'Support continuous improvement and undertake other reasonable duties aligned with the role.'],
  }
}

function OfferLetterModal({ staff, onClose }: { staff: PublicStaffRecord; onClose: () => void }) {
  const initialDate = todayLocalDateOnly()
  const [offerDate, setOfferDate] = useState(initialDate)
  const [joiningDate, setJoiningDate] = useState(initialDate)
  const [location, setLocation] = useState('Coimbatore, Tamil Nadu')
  const [template, setTemplate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/template/ProfitPro_Offer_Letter_Template.html', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Offer letter template could not be loaded.')
        return response.text()
      })
      .then(setTemplate)
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Offer letter template could not be loaded.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const renderedOffer = useMemo(() => {
    if (!template) return ''
    const annualCtc = staff.annualCtc || 0
    const roleContent = getOfferRoleContent(staff.role || '', staff.department || '')
    const values: Record<string, string | number> = {
      offer_date: formatDateOnlyDisplay(offerDate),
      joining_date: formatDateOnlyDisplay(joiningDate),
      employee_name: staff.name,
      employee_email: staff.personalEmail || '',
      role: staff.role || '',
      department: staff.department || '',
      location,
      role_summary: roleContent.summary,
      annual_ctc: annualCtc.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      monthly_salary: (annualCtc / 12).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
    }
    const populated = Object.entries(values).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, escapeHtml(value)), template)
    const responsibilities = roleContent.responsibilities.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    return populated.replaceAll('{{key_responsibilities}}', responsibilities)
  }, [joiningDate, location, offerDate, staff, template])

  async function downloadOffer() {
    const previewDocument = iframeRef.current?.contentDocument
    const pages = previewDocument ? Array.from(previewDocument.querySelectorAll('.offer-page')) as HTMLElement[] : []
    if (!previewDocument || pages.length === 0) return
    setDownloading(true)
    setError('')
    try {
      await waitForPdfAssets(pages)
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      for (let index = 0; index < pages.length; index += 1) {
        // Render at roughly 380 DPI on an A4 page so small offer-letter text
        // remains crisp when viewed at 100% or printed.
        const canvas = await html2canvas(pages[index], { scale: getPdfRenderScale(), useCORS: true, backgroundColor: '#ffffff', logging: false })
        if (index > 0) pdf.addPage('a4', 'portrait')
        // Every offer section is exactly A4. Exact origin placement prevents a
        // fractional vertical shift, and PNG preserves crisp text baselines.
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
        releasePdfCanvas(canvas)
      }
      pdf.save(`ProfitPro_Offer_Letter_${staff.employeeId || staff.name.replace(/\s+/g, '_')}.pdf`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to download offer letter.')
    } finally {
      setDownloading(false)
    }
  }

  const inputClass = 'h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none'
  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/75 px-3 py-5 backdrop-blur-sm sm:px-6">
      <div className="surface w-full max-w-6xl overflow-hidden rounded-xl shadow-2xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 p-5 sm:px-6">
          <div><p className="text-lg font-semibold text-ink">Generate offer letter</p><p className="mt-1 text-sm text-sub">{staff.name} · {staff.role} · {staff.department}</p></div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block w-40"><span className="label-upper mb-2 block text-ghost">Offer date</span><DatePickerInput value={offerDate} onChange={setOfferDate} className={inputClass} required /></label>
            <label className="block w-40"><span className="label-upper mb-2 block text-ghost">Joining date</span><DatePickerInput value={joiningDate} onChange={setJoiningDate} className={inputClass} min={offerDate} required /></label>
            <label className="block w-52"><span className="label-upper mb-2 block text-ghost">Work location</span><input value={location} onChange={(event) => setLocation(event.target.value)} className={inputClass} maxLength={120} required /></label>
            <button type="button" onClick={downloadOffer} disabled={!renderedOffer || downloading} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:opacity-50">{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF</button>
            <button type="button" onClick={onClose} className="h-11 rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-sub hover:text-ink">Close</button>
          </div>
        </div>
        {error ? <p className="m-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
        <div className="max-h-[calc(100vh-9rem)] overflow-auto bg-zinc-950/60 p-3 sm:p-6">
          {loading ? <div className="flex min-h-96 items-center justify-center gap-3 text-sm text-sub"><Loader2 className="h-5 w-5 animate-spin" /> Loading offer letter…</div> : null}
          {!loading && renderedOffer ? <iframe ref={iframeRef} title={`Offer letter preview for ${staff.name}`} srcDoc={renderedOffer} className="mx-auto h-[1123px] w-[794px] max-w-none border-0 bg-white" /> : null}
        </div>
      </div>
    </div>
  )
}

function EditStaffModal({ staff, onClose, onSave }: { staff: PublicStaffRecord; onClose: () => void; onSave: (staff: PublicStaffRecord) => void }) {
  const [name, setName] = useState(staff.name)
  const [email, setEmail] = useState(staff.email)
  const [personalEmail, setPersonalEmail] = useState(staff.personalEmail || '')
  const [employeeId, setEmployeeId] = useState(staff.employeeId || '')
  const [department, setDepartment] = useState(staff.department || '')
  const [role, setRole] = useState(staff.role || '')
  const [annualCtc, setAnnualCtc] = useState(staff.annualCtc ? String(staff.annualCtc) : '')
  const [revenueAccess, setRevenueAccess] = useState(staff.clientAccess?.revenueManagement === true)
  const [onboardingAccess, setOnboardingAccess] = useState(staff.clientAccess?.otaOnboarding === true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputClass =
    'h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm text-ink placeholder:text-ghost transition-colors focus:border-[#66B159] focus:outline-none focus:ring-1 focus:ring-[#66B159]/40'

  useEffect(() => {
    if (!error) return

    const timer = setTimeout(() => setError(''), 3000)
    return () => clearTimeout(timer)
  }, [error])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const updates = {
      ...(name !== staff.name && { name }),
      ...(email !== staff.email && { email }),
      ...(personalEmail !== (staff.personalEmail || '') && { personalEmail }),
      ...(employeeId !== (staff.employeeId || '') && { employeeId }),
      ...(department !== (staff.department || '') && { department }),
      ...(role !== (staff.role || '') && { role }),
      ...(Number(annualCtc) !== (staff.annualCtc || 0) && { annualCtc: Number(annualCtc) }),
      ...((revenueAccess !== (staff.clientAccess?.revenueManagement === true) || onboardingAccess !== (staff.clientAccess?.otaOnboarding === true)) && { clientAccess: { revenueManagement: revenueAccess, otaOnboarding: onboardingAccess } }),
    }

    if (Object.keys(updates).length === 0) {
      onClose()
      return
    }

    try {
      const response = await fetch(`/api/admin/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = (await response.json()) as { message?: string; staff?: PublicStaffRecord }

      if (!response.ok || !data.staff) {
        let errorMessage = 'Failed to update staff member.'
        try {
          errorMessage = data?.message || errorMessage
        } catch (e) {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      onSave(data.staff)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="surface w-full max-w-lg rounded-xl p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <p className="text-lg font-semibold text-ink">Edit Employee</p>
            <p className="mt-1 text-sm text-sub">Update the details for {staff.name}.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-staffName" className="label-upper mb-2 block text-ghost">Employee name</label>
                <input id="edit-staffName" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label htmlFor="edit-staffEmail" className="label-upper mb-2 block text-ghost">Company email</label>
                <input id="edit-staffEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label htmlFor="edit-staffPersonalEmail" className="label-upper mb-2 block text-ghost">Personal email</label>
                <input id="edit-staffPersonalEmail" type="email" autoComplete="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label htmlFor="edit-staffEmployeeId" className="label-upper mb-2 block text-ghost">Employee ID</label>
                <input id="edit-staffEmployeeId" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label htmlFor="edit-staffDepartment" className="label-upper mb-2 block text-ghost">Department</label>
                <select id="edit-staffDepartment" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} required>{department && !(STAFF_DEPARTMENTS as readonly string[]).includes(department) ? <option value={department}>{department} (existing)</option> : null}{STAFF_DEPARTMENTS.map((option) => <option key={option} value={option}>{option}</option>)}</select>
              </div>
              <div>
                <label htmlFor="edit-staffRole" className="label-upper mb-2 block text-ghost">Role</label>
                <select id="edit-staffRole" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} required>{role && !(STAFF_ROLES as readonly string[]).includes(role) ? <option value={role}>{role} (existing)</option> : null}{STAFF_ROLES.map((option) => <option key={option} value={option}>{option}</option>)}</select>
              </div>
              <div>
                <label htmlFor="edit-staffAnnualCtc" className="label-upper mb-2 block text-ghost">Annual CTC</label>
                <input id="edit-staffAnnualCtc" type="number" inputMode="decimal" min="0.01" step="0.01" value={annualCtc} onChange={(e) => setAnnualCtc(e.target.value)} className={inputClass} required />
              </div>
            </div>
            <fieldset className="rounded-lg border border-zinc-700 bg-zinc-950/30 p-4">
              <legend className="label-upper px-1 text-ghost">Client service access</legend>
              <div className="flex flex-wrap gap-5">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink"><input type="checkbox" checked={revenueAccess} onChange={(event) => setRevenueAccess(event.target.checked)} className="h-4 w-4 accent-[#66B159]" /> Revenue Management</label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink"><input type="checkbox" checked={onboardingAccess} onChange={(event) => setOnboardingAccess(event.target.checked)} className="h-4 w-4 accent-[#66B159]" /> OTA Onboarding</label>
              </div>
            </fieldset>
            {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="flex h-11 items-center justify-center rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-sub transition-colors hover:border-zinc-600 hover:text-ink">Cancel</button>
            <button type="submit" disabled={loading} className="flex h-11 w-28 items-center justify-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-[#FFFCFC] transition-colors hover:bg-[#73bd66] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatWorkTime(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function formatWorkDuration(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`
}

function workSessionDurationMinutes(session: WorkSessionRecord, now: number) {
  if (session.status !== 'active') return Math.max(0, session.durationMinutes)
  const started = new Date(session.startedAt).getTime()
  return Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 60_000)) : 0
}

function formatLiveWorkDuration(startedAt: string, now: number) {
  const started = new Date(startedAt).getTime()
  if (!Number.isFinite(started)) return '0m'
  return formatWorkDuration(Math.max(0, Math.floor((now - started) / 60_000)))
}

function WorkSessionStatus({ status }: { status: WorkSessionRecord['status'] }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${status === 'completed' ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-[#66B159]/25 bg-[#66B159]/10 text-[#66B159]'}`}>{status === 'completed' ? 'Completed' : 'In progress'}</span>
}

function TaskSummaryStatus({ status }: { status: DailyWorkSummary['status'] }) {
  const style = status === 'completed'
    ? 'border-green-500/20 bg-green-500/10 text-green-400'
    : status === 'not-started'
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
      : 'border-[#66B159]/25 bg-[#66B159]/10 text-[#66B159]'
  const label = status === 'completed' ? 'Completed' : status === 'not-started' ? 'Not started' : 'Working'
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>{label}</span>
}

function TaskMetric({ label, value, detail, tone }: { label: string; value: string | number; detail: string; tone: 'green' | 'amber' }) {
  const valueStyle = tone === 'amber' ? 'text-amber-400' : 'text-[#66B159]'
  return (
    <div className="surface rounded-lg p-5">
      <p className={`text-2xl font-semibold ${valueStyle}`}>{value}</p>
      <p className="mt-2 text-sm font-medium text-ink">{label}</p>
      <p className="mt-1 text-xs text-sub">{detail}</p>
    </div>
  )
}

function toDateTimeLocal(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.valueOf() - offset).toISOString().slice(0, 16)
}

function WorkSessionCorrectionModal({ session, employeeName, onClose, onSaved }: {
  session: WorkSessionRecord
  employeeName: string
  onClose: () => void
  onSaved: (session: WorkSessionRecord) => void
}) {
  const [startedAt, setStartedAt] = useState(toDateTimeLocal(session.startedAt))
  const [endedAt, setEndedAt] = useState(toDateTimeLocal(session.endedAt))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/tasks/${encodeURIComponent(session.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startedAt: new Date(startedAt).toISOString(),
          endedAt: endedAt ? new Date(endedAt).toISOString() : null,
        }),
      })
      const data = await response.json() as { workSession?: WorkSessionRecord; message?: string }
      if (!response.ok || !data.workSession) throw new Error(data.message || 'Unable to correct work-session times.')
      onSaved(data.workSession)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to correct work-session times.')
    } finally {
      setLoading(false)
    }
  }

  const modalInputClass = 'h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-ink">Correct work time</p>
            <p className="mt-1 text-sm text-sub">{employeeName} · {formatDateOnlyDisplay(session.workDate)}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-sub hover:bg-zinc-800 hover:text-ink" aria-label="Close correction form"><XCircle className="h-4 w-4" /></button>
        </div>
        <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-200">Every correction records the previous and updated times in the Admin audit log.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="correctWorkStart" className="label-upper mb-2 block text-ghost">Start time</label><input id="correctWorkStart" type="datetime-local" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} className={modalInputClass} required /></div>
          <div><label htmlFor="correctWorkEnd" className="label-upper mb-2 block text-ghost">End time</label><input id="correctWorkEnd" type="datetime-local" value={endedAt} onChange={(event) => setEndedAt(event.target.value)} className={modalInputClass} required={session.status === 'completed'} /></div>
        </div>
        {error ? <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-sub hover:text-ink">Cancel</button>
          <button type="submit" disabled={loading || !startedAt || (session.status === 'completed' && !endedAt)} className="flex h-10 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save correction</button>
        </div>
      </form>
    </div>
  )
}

function ExpenseCorrectionModal({ expense, onClose, onSaved }: {
  expense: ExpenseRecord
  onClose: () => void
  onSaved: (expense: ExpenseRecord) => void
}) {
  const [staffName, setStaffName] = useState(
    expense.submittedByRole === 'admin' && (ADMIN_NAMES as readonly string[]).includes(expense.staffName)
      ? expense.staffName
      : '',
  )
  const [expenseDate, setExpenseDate] = useState(expense.expenseDate)
  const [expenseType, setExpenseType] = useState<ExpenseRecord['expenseType']>(expense.expenseType)
  const [customExpenseType, setCustomExpenseType] = useState(expense.customExpenseType || '')
  const [amount, setAmount] = useState(String(expense.amount))
  const [city, setCity] = useState(expense.city || '')
  const [description, setDescription] = useState(expense.description || '')
  const [receiptUrl, setReceiptUrl] = useState(expense.receiptUrl || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/expenses/${encodeURIComponent(expense.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'correct',
          staffName: expense.submittedByRole === 'admin' ? staffName : '',
          expenseDate,
          expenseType,
          customExpenseType: expenseType === 'other' ? customExpenseType : '',
          amount: Number(amount),
          city,
          description,
          receiptUrl,
        }),
      })
      const data = await response.json() as { expense?: ExpenseRecord; message?: string }
      if (!response.ok || !data.expense) throw new Error(data.message || 'Unable to correct this expense.')
      onSaved(data.expense)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to correct this expense.')
    } finally {
      setLoading(false)
    }
  }

  const modalInputClass = 'h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
      <form onSubmit={submit} className="my-auto w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-ink">Correct expense</p>
            <p className="mt-1 text-sm text-sub">{expense.submittedByRole === 'admin' ? 'Admin expense' : `Staff expense · ${expense.staffName || expense.staffEmail}`}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-sub hover:bg-zinc-800 hover:text-ink" aria-label="Close expense correction"><XCircle className="h-4 w-4" /></button>
        </div>
        <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-200">The expense status and reimbursement status will not change. Corrected fields and their previous values are saved in the Admin audit log.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {expense.submittedByRole === 'admin' ? <div><label htmlFor="correctExpenseAdmin" className="label-upper mb-2 block text-ghost">Admin name</label><select id="correctExpenseAdmin" value={staffName} onChange={(event) => setStaffName(event.target.value)} className={modalInputClass} required><option value="">Select Admin</option>{ADMIN_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}</select></div> : null}
          <div><label htmlFor="correctExpenseDate" className="label-upper mb-2 block text-ghost">Expense date</label><DatePickerInput id="correctExpenseDate" value={expenseDate} onChange={setExpenseDate} className={modalInputClass} required /></div>
          <div><label htmlFor="correctExpenseType" className="label-upper mb-2 block text-ghost">Expense type</label><select id="correctExpenseType" value={expenseType} onChange={(event) => { const value = event.target.value as ExpenseRecord['expenseType']; setExpenseType(value); if (value !== 'other') setCustomExpenseType('') }} className={modalInputClass}><option value="travel">Travel</option><option value="food">Food</option><option value="fuel">Fuel</option><option value="other">Other</option></select></div>
          {expenseType === 'other' ? <div><label htmlFor="correctExpenseCustomType" className="label-upper mb-2 block text-ghost">Specify type</label><input id="correctExpenseCustomType" value={customExpenseType} onChange={(event) => setCustomExpenseType(event.target.value)} maxLength={100} className={modalInputClass} required /></div> : null}
          <div><label htmlFor="correctExpenseAmount" className="label-upper mb-2 block text-ghost">Amount</label><input id="correctExpenseAmount" type="number" inputMode="decimal" min="0.01" max="10000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className={modalInputClass} required /></div>
          <div><label htmlFor="correctExpenseCity" className="label-upper mb-2 block text-ghost">City</label><input id="correctExpenseCity" value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} className={modalInputClass} /></div>
          <div className="sm:col-span-2"><label htmlFor="correctExpenseReceipt" className="label-upper mb-2 block text-ghost">Receipt link (optional)</label><input id="correctExpenseReceipt" type="url" inputMode="url" value={receiptUrl} onChange={(event) => setReceiptUrl(event.target.value)} maxLength={2048} className={modalInputClass} placeholder="https://..." /></div>
          <div className="sm:col-span-2"><label htmlFor="correctExpenseDescription" className="label-upper mb-2 block text-ghost">Description</label><textarea id="correctExpenseDescription" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} className={`${modalInputClass} h-auto resize-y py-3`} /></div>
        </div>
        {error ? <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-sub hover:text-ink">Cancel</button>
          <button type="submit" disabled={loading || !expenseDate || !amount || (expense.submittedByRole === 'admin' && !staffName)} className="flex h-10 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save correction</button>
        </div>
      </form>
    </div>
  )
}

function DashboardMetric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string | number; detail: string }) {
  return (
    <div className="surface rounded-lg p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#66B159]/10 text-[#4d9144]">{icon}</div>
      </div>
      <p className="mt-5 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm font-medium text-ink">{label}</p>
      <p className="mt-1 text-xs text-sub">{detail}</p>
    </div>
  )
}

function DashboardQueueRow({ label, count, action, detail, onClick }: { label: string; count: number; action: string; detail?: string; onClick: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-1 text-xs text-sub">{detail || (count === 0 ? 'Nothing waiting right now' : `${count} awaiting approval`)}</p>
      </div>
      <button type="button" onClick={onClick} className="text-sm font-semibold text-[#4d9144] hover:text-[#36722f]">{action}</button>
    </div>
  )
}

const StatusBadge = ({ status }: { status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' }) => {
  const statusStyles = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    active: 'bg-[#66B159]/10 text-[#66B159] border-[#66B159]/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${statusStyles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
