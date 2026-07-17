'use client'

import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Building2, CheckCircle2, ClipboardList, Download, Edit, Eye, EyeOff, FileDown, FileText, Filter, KeyRound, Loader2, LogOut, ReceiptText, RefreshCw, Search, Trash2, User, UserPlus, Users, XCircle } from 'lucide-react'
import type { SessionUser } from '@/lib/auth'
import type { ExpenseFieldSettings, ExpenseRecord, LeaveRequestRecord, PropertyRecord, PublicStaffRecord, SalaryRecord, SecuritySettings, TimesheetRecord } from '@/lib/firestore'
import type { OnboardingRecord } from '@/lib/onboarding'
import { getVersionLabel, type AppVersion } from '@/lib/version'
import { ClientServicesPanel } from '@/app/client-services-panel'
import { PropertiesPanel } from '@/app/properties-panel'
import { DatePickerInput } from '@/components/ui/DatePickerInput'

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
  approvedWorkDays: number
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
  // Staff list state
  const [staffList, setStaffList] = useState<PublicStaffRecord[]>([])
  const [staffSearch, setStaffSearch] = useState('')
  const [salaryList, setSalaryList] = useState<SalaryRecord[]>([])
  const [editingStaff, setEditingStaff] = useState<PublicStaffRecord | null>(null)
  const [offerStaff, setOfferStaff] = useState<PublicStaffRecord | null>(null)
  const [propertyList, setPropertyList] = useState<PropertyRecord[]>([])
  const [onboardingList, setOnboardingList] = useState<OnboardingRecord[]>([])
  // Timesheet state
  const [timesheetList, setTimesheetList] = useState<TimesheetRecord[]>([])
  const [showTimesheetFilters, setShowTimesheetFilters] = useState(false)
  const [timesheetFilterEmployee, setTimesheetFilterEmployee] = useState('all')
  const [timesheetWorkDate, setTimesheetWorkDate] = useState('')
  const [timesheetWeekEnd, setTimesheetWeekEnd] = useState('')
  const [timesheetWorkedDates, setTimesheetWorkedDates] = useState<string[]>([])
  const [timesheetLocation, setTimesheetLocation] = useState<'remote' | 'office'>('remote')
  const [timesheetNotes, setTimesheetNotes] = useState('')
  // Expense state
  const [expenseList, setExpenseList] = useState<ExpenseRecord[]>([])
  const [leaveList, setLeaveList] = useState<LeaveRequestRecord[]>([])
  const [leaveStartDate, setLeaveStartDate] = useState('')
  const [leaveEndDate, setLeaveEndDate] = useState('')
  const [leaveReason, setLeaveReason] = useState('')
  const [expenseCity, setExpenseCity] = useState('')
  const [expenseType, setExpenseType] = useState<'travel' | 'food' | 'fuel' | 'other'>('travel')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNotes, setExpenseNotes] = useState('')
  const [expenseReceiptUrl, setExpenseReceiptUrl] = useState('')
  const [expenseSettings, setExpenseSettings] = useState<ExpenseFieldSettings>({ cityRequired: true, descriptionRequired: true, receiptRequired: true })
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({ sessionHours: 12, minPasswordLength: 12, requireUppercase: false, requireNumber: false })

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

    if (activeTab === 'dashboard') {
      setLoading(true)
      Promise.all([fetch('/api/admin/staff'), fetch('/api/admin/timesheets'), fetch('/api/admin/expenses'), fetch('/api/admin/properties')])
        .then(async ([staffRes, timesheetRes, expenseRes, propertyRes]) => {
          const [staffData, timesheetData, expenseData, propertyData] = await Promise.all([staffRes.json(), timesheetRes.json(), expenseRes.json(), propertyRes.json()])
          if (staffData.staff) setStaffList(staffData.staff)
          if (timesheetData.timesheets) setTimesheetList(timesheetData.timesheets)
          if (expenseData.expenses) setExpenseList(expenseData.expenses)
          if (propertyData.properties) setPropertyList(propertyData.properties)
        })
        .catch(() => setError('Could not load dashboard data.'))
        .finally(() => setLoading(false))
    }

    if (activeTab === 'staff') {
      setLoading(true)
      fetch('/api/admin/staff')
        .then((res) => res.json())
        .then((data) => {
          if (data.staff) {
            setStaffList(data.staff)
          }
        })
        .catch(() => setError('Could not load employee list.'))
        .finally(() => setLoading(false))
    }

    if (activeTab === 'properties') {
      setLoading(true)
      Promise.all([fetch('/api/admin/properties'), fetch('/api/admin/onboardings', { credentials: 'same-origin', cache: 'no-store' })])
        .then(async ([propertyRes, onboardingRes]) => {
          const [propertyData, onboardingData] = await Promise.all([propertyRes.json(), onboardingRes.json()])
          if (propertyData.properties) setPropertyList(propertyData.properties)
          if (onboardingData.onboardings) setOnboardingList(onboardingData.onboardings)
        })
        .catch(() => setError('Could not load client properties.'))
        .finally(() => setLoading(false))
    }

    if (activeTab === 'timesheets') {
      setLoading(true)
      Promise.all([fetch('/api/admin/timesheets'), fetch('/api/admin/staff')])
        .then(async (responses) => {
          const [timesheetRes, staffRes] = responses
          const timesheetData = await timesheetRes.json()
          if (timesheetData.timesheets) {
            setTimesheetList(timesheetData.timesheets)
          }
          const staffData = await staffRes.json()
          if (staffData.staff) {
            setStaffList(staffData.staff)
          }
        })
        .catch(() => setError('Could not load data for this view.'))
        .finally(() => setLoading(false))
    }

    if (activeTab === 'expenses') {
      setLoading(true)
      fetch('/api/admin/expenses')
        .then((res) => res.json())
        .then((data) => {
          if (data.expenses) {
            setExpenseList(data.expenses)
          }
          if (data.settings) setExpenseSettings(data.settings)
        })
        .catch(() => setError('Could not load expenses.'))
        .finally(() => setLoading(false))
    }

    if (activeTab === 'payroll') {
      setLoading(true)
      Promise.all([fetch('/api/admin/salaries'), fetch('/api/admin/timesheets')])
        .then(async ([salaryRes, timesheetRes]) => {
          const [salaryData, timesheetData] = await Promise.all([salaryRes.json(), timesheetRes.json()])
          if (salaryData.staff) setStaffList(salaryData.staff)
          if (salaryData.salaries) setSalaryList(salaryData.salaries)
          if (timesheetData.timesheets) setTimesheetList(timesheetData.timesheets)
        })
        .catch(() => setError('Could not load payroll data.'))
        .finally(() => setLoading(false))
    }

    if (activeTab === 'leaves') {
      setLoading(true)
      fetch('/api/admin/leaves').then((res) => res.json()).then((data) => { if (data.leaves) setLeaveList(data.leaves) }).catch(() => setError('Could not load leave requests.')).finally(() => setLoading(false))
    }

    if (activeTab === 'settings') {
      Promise.all([fetch('/api/admin/expense-settings'), fetch('/api/admin/security-settings')])
        .then(async ([expenseRes, securityRes]) => {
          const [expenseData, securityData] = await Promise.all([expenseRes.json(), securityRes.json()])
          if (expenseData.settings) setExpenseSettings(expenseData.settings)
          if (securityData.settings) setSecuritySettings(securityData.settings)
        })
        .catch(() => setError('Could not load expense settings.'))
    }
  }, [activeTab, user.role])

  useEffect(() => {
    if (user.role !== 'staff' || user.mustChangePassword) return

    if (activeTab === 'expenses') {
      setLoading(true)
      fetch('/api/staff/expenses')
        .then((res) => res.json())
        .then((data) => {
          if (data.expenses) {
            setExpenseList(data.expenses)
          }
        })
        .catch(() => setError('Could not load your expenses.'))
        .finally(() => setLoading(false))
    }

    if (activeTab === 'timesheets') {
      setLoading(true)
      fetch('/api/staff/timesheets')
        .then((res) => res.json())
        .then((data) => {
          if (data.timesheets) {
            setTimesheetList(data.timesheets)
          }
        })
        .catch(() => setError('Could not load your timesheets.'))
        .finally(() => setLoading(false))
    }

    if (activeTab === 'leaves') {
      setLoading(true)
      fetch('/api/staff/leaves').then((res) => res.json()).then((data) => { if (data.leaves) setLeaveList(data.leaves) }).catch(() => setError('Could not load your leave requests.')).finally(() => setLoading(false))
    }

    if (activeTab === 'properties') {
      setLoading(true)
      Promise.all([fetch('/api/properties'), fetch('/api/onboardings')])
        .then(async ([propertyRes, onboardingRes]) => {
          const [propertyData, onboardingData] = await Promise.all([propertyRes.json(), onboardingRes.json()])
          if (propertyData.properties) setPropertyList(propertyData.properties)
          if (onboardingData.onboardings) setOnboardingList(onboardingData.onboardings)
        })
        .catch(() => setError('Could not load client properties.'))
        .finally(() => setLoading(false))
    }

  }, [activeTab, user.mustChangePassword, user.role])

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
        body: JSON.stringify({ firstName: staffFirstName, lastName: staffLastName, personalEmail: staffPersonalEmail, annualCtc: Number(staffCtc), employeeId: staffEmployeeId, department: staffDepartment, role: staffRole }),
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

  async function handleDeleteStaff(staffId: string, staffName: string) {
    if (!window.confirm(`Are you sure you want to delete ${staffName}? This action cannot be undone.`)) {
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
      setMessage('Employee deleted.')
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

  async function handleTimesheetStatusUpdate(timesheetId: string, status: 'approved' | 'rejected') {
    const decisionNote = status === 'rejected' ? window.prompt('Rejection reason (shown to the employee):') : ''
    if (status === 'rejected' && decisionNote === null) return
    const originalTimesheets = [...timesheetList]
    // Optimistic UI update
    setTimesheetList((prev) => prev.map((ts) => (ts.id === timesheetId ? { ...ts, status } : ts)))

    try {
      const response = await fetch(`/api/admin/timesheets/${timesheetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, decisionNote }),
      })

      if (!response.ok) {
        // Revert on failure
        setTimesheetList(originalTimesheets)
        let errorMessage = 'Failed to update timesheet status.'
        try {
          const data = await response.json()
          errorMessage = data.message || errorMessage
        } catch (e) {
          errorMessage = response.statusText || errorMessage
        }
        setError(errorMessage)
      }
    } catch (err) {
      setTimesheetList(originalTimesheets)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
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

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/staff/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: expenseCity, expenseType, description: expenseNotes, amount: Number(expenseAmount), receiptUrl: expenseReceiptUrl }),
      })
      const data = (await response.json()) as { message?: string; expense?: ExpenseRecord }

      if (!response.ok || !data.expense) {
        setError(data.message || 'Unable to submit expense.')
        return
      }

      setExpenseCity('')
      setExpenseAmount('')
      setExpenseNotes('')
      setExpenseReceiptUrl('')
      setExpenseList((prev) => [data.expense!, ...prev])
      setMessage('Expense submitted for admin approval.')
    } catch {
      setError('Unable to submit expense right now.')
    } finally {
      setLoading(false)
    }
  }

  async function submitTimesheet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/staff/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: timesheetWorkDate, weekEnd: timesheetWeekEnd, workedDates: timesheetWorkedDates, workLocation: timesheetLocation, notes: timesheetNotes }),
      })
      const data = (await response.json()) as { message?: string; timesheet?: TimesheetRecord }

      if (!response.ok || !data.timesheet) {
        setError(data.message || 'Unable to submit timesheet.')
        return
      }

      setTimesheetWorkDate('')
      setTimesheetWeekEnd('')
      setTimesheetWorkedDates([])
      setTimesheetNotes('')
      setTimesheetList((prev) => [data.timesheet!, ...prev])
      setMessage('Timesheet submitted for admin approval.')
    } catch {
      setError('Unable to submit timesheet right now.')
    } finally {
      setLoading(false)
    }
  }

  async function submitLeaveRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/staff/leaves', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: leaveStartDate, endDate: leaveEndDate, reason: leaveReason }) })
      const data = await response.json() as { leave?: LeaveRequestRecord; message?: string }
      if (!response.ok || !data.leave) throw new Error(data.message || 'Unable to submit leave request.')
      setLeaveList((current) => [data.leave!, ...current]); setLeaveStartDate(''); setLeaveEndDate(''); setLeaveReason(''); setMessage('Leave request submitted.')
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
    try {
      const response = await fetch('/api/admin/security-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(securitySettings) })
      if (!response.ok) throw new Error()
      setMessage('Security settings saved.')
    } catch { setError('Unable to save security settings.') } finally { setLoading(false) }
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

    const headers: (keyof PayrollRow)[] = ['employeeName', 'employeeId', 'department', 'payrollPeriod', 'monthlySalary', 'approvedWorkDays']
    const headerRow = 'Employee Name,Employee ID,Department,Payroll Period,Monthly Salary,Approved Work Days'

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

  const filteredTimesheets = useMemo(() => {
    if (timesheetFilterEmployee === 'all') {
      return timesheetList
    }
    return timesheetList.filter(ts => ts.staffEmail === timesheetFilterEmployee)
  }, [timesheetList, timesheetFilterEmployee])

  const weekDays = useMemo(() => {
    if (!timesheetWorkDate) return []
    const start = new Date(`${timesheetWorkDate}T00:00:00`)
    if (Number.isNaN(start.getTime())) return []
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return { value: date.toISOString().slice(0, 10), label: date.toLocaleDateString('en-IN', { weekday: 'short' }), day: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }
    })
  }, [timesheetWorkDate])

  const payrollRows = useMemo<PayrollRow[]>(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const period = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

    return staffList.map((staff) => {
      const monthlySalary = salaryList.find((salary) => salary.staffEmail === staff.email)?.baseSalary || 0
      const workedDates = new Set(
        timesheetList
          .filter((timesheet) => timesheet.staffEmail === staff.email && timesheet.status === 'approved')
          .flatMap((timesheet) => timesheet.workedDates.length ? timesheet.workedDates : [timesheet.workDate])
          .filter((date) => {
            const parsed = new Date(`${date}T00:00:00`)
            return parsed.getFullYear() === currentYear && parsed.getMonth() === currentMonth
          })
      )

      return { employeeName: staff.name, employeeId: staff.employeeId || 'N/A', department: staff.department || 'N/A', payrollPeriod: period, monthlySalary, approvedWorkDays: workedDates.size }
    })
  }, [salaryList, staffList, timesheetList])

  const pendingTimesheets = timesheetList.filter((timesheet) => timesheet.status === 'pending')
  const pendingExpenses = expenseList.filter((expense) => expense.status === 'pending')
  const approvedExpenseTotal = expenseList
    .filter((expense) => expense.status === 'approved')
    .reduce((total, expense) => total + expense.amount, 0)
  const recentActivity = [...timesheetList.map((timesheet) => ({ type: 'Timesheet', title: timesheet.workDate, status: timesheet.status, createdAt: timesheet.createdAt })), ...expenseList.map((expense) => ({ type: 'Expense', title: expense.title, status: expense.status, createdAt: expense.createdAt }))]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5)

  return (
    <main className={`portal-app ${user.role === 'admin' ? 'admin-workspace' : ''} relative flex min-h-screen flex-col overflow-hidden bg-[#0a0b0c] px-6 py-8 text-ink sm:px-10`}>
      <video className="portal-video" autoPlay loop muted playsInline aria-hidden="true">
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
                onClick={() => setActiveTab('timesheets')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'timesheets' ? 'bg-zinc-700 text-ink' : 'text-sub hover:text-ink/80'
                }`}
              >
                Timesheets
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
              {['dashboard', 'properties', 'expenses', 'timesheets', 'leaves'].map((tab) => (
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
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-ink sm:text-6xl">
            {title.endsWith(' Workspace') ? <>{title.slice(0, -10)}{' '}<span className="text-[#66B159]"> Workspace</span></> : title}
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
                  onClick={() => setActiveTab('timesheets')}
                  className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'timesheets'
                      ? 'border-[#66B159] text-ink'
                      : 'border-transparent text-sub hover:border-zinc-700'
                  }`}
                >
                  Timesheets
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
                {['dashboard', 'properties', 'expenses', 'timesheets', 'leaves'].map((tab) => (
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

          <div className={`mt-10 w-full ${(user.role === 'admin' || activeTab === 'dashboard' || activeTab === 'properties' || activeTab === 'expenses' || activeTab === 'timesheets') ? 'max-w-7xl' : 'max-w-3xl'}`}>
            {user.role === 'admin'
              ? {
                   dashboard: (
                    <div className="admin-dashboard space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <DashboardMetric icon={<Users className="h-5 w-5" />} label="Active employees" value={staffList.length} detail="People in your workspace" />
                        <DashboardMetric icon={<Building2 className="h-5 w-5" />} label="Active client properties" value={propertyList.filter((property) => property.status === 'active').length} detail="Hospitality properties served" />
                        <DashboardMetric icon={<ClipboardList className="h-5 w-5" />} label="Timesheets to review" value={pendingTimesheets.length} detail="Awaiting a decision" />
                        <DashboardMetric icon={<ReceiptText className="h-5 w-5" />} label="Expenses to review" value={pendingExpenses.length} detail="Awaiting a decision" />
                        <DashboardMetric icon={<CheckCircle2 className="h-5 w-5" />} label="Approved expenses" value={`Rs. ${approvedExpenseTotal.toLocaleString('en-IN')}`} detail="Total approved to date" />
                      </div>

                      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
                        <div className="surface rounded-lg p-6 sm:p-7">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-lg font-semibold text-ink">Approval queue</p>
                              <p className="mt-1 text-sm text-sub">Keep employee submissions moving.</p>
                            </div>
                            <button type="button" onClick={() => setActiveTab('timesheets')} className="text-sm font-semibold text-[#4d9144] hover:text-[#36722f]">Review timesheets</button>
                          </div>
                          <div className="mt-6 divide-y divide-zinc-200">
                            <DashboardQueueRow label="Timesheets" count={pendingTimesheets.length} action="Open queue" onClick={() => setActiveTab('timesheets')} />
                            <DashboardQueueRow label="Expense claims" count={pendingExpenses.length} action="Open queue" onClick={() => setActiveTab('expenses')} />
                          </div>
                        </div>
                        <div className="surface rounded-lg p-6 sm:p-7">
                          <p className="text-lg font-semibold text-ink">Quick actions</p>
                          <div className="mt-5 grid gap-3">
                            <button type="button" onClick={() => { setActiveTab('staff'); setStaffSubTab('add') }} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-[#66B159]">Add employee <UserPlus className="h-4 w-4 text-[#4d9144]" /></button>
                            <button type="button" onClick={() => setActiveTab('properties')} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-[#66B159]">Manage client properties <Building2 className="h-4 w-4 text-[#4d9144]" /></button>
                            <button type="button" onClick={() => setActiveTab('expenses')} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-[#66B159]">Review expenses <ReceiptText className="h-4 w-4 text-[#4d9144]" /></button>
                            <button type="button" onClick={() => setActiveTab('payroll')} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-[#66B159]">Open payroll <FileDown className="h-4 w-4 text-[#4d9144]" /></button>
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
                              <input id="staffDepartment" value={staffDepartment} onChange={(e) => setStaffDepartment(e.target.value)} className={inputClass} required />
                            </div>
                            <div>
                              <label htmlFor="staffRole" className="label-upper mb-2 block text-ghost">
                                Role
                              </label>
                              <input id="staffRole" value={staffRole} onChange={(e) => setStaffRole(e.target.value)} className={inputClass} required />
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
                                       </td>
                                      <td className="px-6 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${staff.active ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-400'}`}>{staff.active ? 'Active' : 'Pending'}</span></td>
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                          {!staff.active ? <button type="button" onClick={() => setOfferStaff(staff)} className="h-8 w-8 flex items-center justify-center rounded-md text-sub hover:bg-[#66B159]/20 hover:text-[#66B159] transition-colors" aria-label={`Generate offer letter for ${staff.name}`} title="Generate offer letter"><FileText className="h-4 w-4" /></button> : null}
                                          {!staff.active ? <button type="button" onClick={() => activateAcknowledgedStaff(staff)} className="h-8 w-8 flex items-center justify-center rounded-md text-sub hover:bg-green-500/20 hover:text-green-400 transition-colors" aria-label={`Acknowledge offer and activate ${staff.name}`} title="Acknowledge & activate"><CheckCircle2 className="h-4 w-4" /></button> : null}
                                          <button type="button" onClick={() => setEditingStaff(staff)} className="h-8 w-8 flex items-center justify-center rounded-md text-sub hover:bg-zinc-800 hover:text-ink transition-colors" aria-label={`Edit ${staff.name}`} title="Edit employee"><Edit className="h-4 w-4" /></button>
                                          <button type="button" onClick={() => handleResetPassword(staff.id, staff.name)} className="h-8 w-8 flex items-center justify-center rounded-md text-sub hover:bg-amber-500/20 hover:text-amber-400 transition-colors" aria-label={`Reset password for ${staff.name}`} title="Reset password"><RefreshCw className="h-4 w-4" /></button>
                                          <button type="button" onClick={() => handleDeleteStaff(staff.id, staff.name)} className="h-8 w-8 flex items-center justify-center rounded-md text-sub hover:bg-red-500/20 hover:text-red-400 transition-colors" aria-label={`Delete ${staff.name}`} title="Delete employee"><Trash2 className="h-4 w-4" /></button>
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
                  timesheets: (
                    <div className="surface rounded-lg">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 p-6">
                        <div>
                          <p className="text-lg font-semibold text-ink">Timesheet Management</p>
                          <p className="mt-1 text-sm text-sub">Review and approve submitted timesheets.</p>
                        </div>
                        <div className="relative flex items-center gap-2">
                          <button type="button" onClick={() => setShowTimesheetFilters(v => !v)} className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm text-sub transition-colors hover:border-zinc-600 hover:text-ink">
                            <Filter className="h-4 w-4" />
                            Filter
                          </button>
                          {showTimesheetFilters && (
                            <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-2xl">
                              <label htmlFor="timesheet-employee-filter" className="label-upper mb-2 block text-ghost">
                                Employee
                              </label>
                              <select
                                id="timesheet-employee-filter"
                                value={timesheetFilterEmployee}
                                onChange={(e) => setTimesheetFilterEmployee(e.target.value)}
                                className="h-10 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 text-sm text-ink"
                              >
                                <option value="all">All Employees</option>
                                {staffList.map(staff => (
                                  <option key={staff.id} value={staff.email}>{staff.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-zinc-700 text-left">
                            <tr>
                              <th className="px-6 py-4 font-medium text-sub">Employee</th>
                              <th className="px-6 py-4 font-medium text-sub">Week</th>
                              <th className="px-6 py-4 font-medium text-sub">Worked days</th>
                              <th className="px-6 py-4 font-medium text-sub">Location</th>
                              <th className="px-6 py-4 font-medium text-sub">Status</th>
                              <th className="px-6 py-4 font-medium text-sub">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="py-10 text-center text-sub"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                            ) : (
                              filteredTimesheets.map((ts) => (
                                <tr key={ts.id} className="border-b border-zinc-800 last:border-none">
                                  <td className="px-6 py-4 text-ink">{ts.staffEmail}</td>
                                  <td className="px-6 py-4 text-sub">{ts.weekStart || ts.workDate} to {ts.weekEnd || ts.workDate}</td>
                                  <td className="px-6 py-4 text-sub">{ts.workedDates.length ? ts.workedDates.map((date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })).join(', ') : 'Not recorded'}</td>
                                  <td className="px-6 py-4 text-sub">{ts.workLocation}</td>
                                  <td className="px-6 py-4"><StatusBadge status={ts.status} /></td>
                                  <td className="px-6 py-4">
                                    {ts.status === 'pending' ? (
                                      <div className="flex items-center gap-2">
                                        <button onClick={() => handleTimesheetStatusUpdate(ts.id, 'approved')} className="flex h-8 items-center gap-1.5 rounded-md bg-green-500/10 px-2.5 text-xs text-green-400 transition-colors hover:bg-green-500/20"><CheckCircle2 className="h-3.5 w-3.5" />Approve</button>
                                        <button onClick={() => handleTimesheetStatusUpdate(ts.id, 'rejected')} className="flex h-8 items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 text-xs text-red-400 transition-colors hover:bg-red-500/20"><XCircle className="h-3.5 w-3.5" />Reject</button>
                                      </div>
                                    ) : <span className="text-xs text-ghost">No actions</span>}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ),
                  expenses: (
                    <div className="surface rounded-lg">
                      <div className="border-b border-zinc-800 p-6">
                        <p className="text-lg font-semibold text-ink">Expense Approvals</p>
                        <p className="mt-1 text-sm text-sub">Review submitted employee expenses.</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-zinc-700 text-left">
                            <tr>
                                  <th className="px-6 py-4 font-medium text-sub">Staff</th>
                                  <th className="px-6 py-4 font-medium text-sub">Claim</th>
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
                                    <p className="font-medium text-ink">{expense.staffName || expense.staffEmail}</p>
                                    <p className="text-xs text-sub">{expense.staffEmail}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="font-medium capitalize text-ink">{expense.expenseType || expense.title}</p>
                                    <p className="mt-1 text-xs text-sub">{expense.city || 'No city'}{expense.description ? ` · ${expense.description}` : ''}</p>
                                    {expense.receiptUrl || expense.receiptDataUrl ? <a href={expense.receiptUrl || expense.receiptDataUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-[#66B159] hover:underline">View receipt</a> : <p className="mt-1 text-xs text-sub">No receipt reference</p>}
                                  </td>
                                  <td className="px-6 py-4 text-sub">₹{expense.amount.toLocaleString('en-IN')}</td>
                                  <td className="px-6 py-4"><StatusBadge status={expense.status} /></td>
                                  <td className="px-6 py-4">
                                    {expense.status === 'pending' ? (
                                      <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => handleExpenseStatusUpdate(expense.id, 'approved')} className="flex h-8 items-center gap-1.5 rounded-md bg-green-500/10 px-2.5 text-xs text-green-400 transition-colors hover:bg-green-500/20"><CheckCircle2 className="h-3.5 w-3.5" />Approve</button>
                                        <button type="button" onClick={() => handleExpenseStatusUpdate(expense.id, 'rejected')} className="flex h-8 items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 text-xs text-red-400 transition-colors hover:bg-red-500/20"><XCircle className="h-3.5 w-3.5" />Reject</button>
                                      </div>
                                    ) : <span className="text-xs text-ghost">No actions</span>}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ),
                  leaves: (
                    <div className="surface rounded-lg">
                      <div className="border-b border-zinc-800 p-6"><p className="text-lg font-semibold text-ink">Leave Requests</p><p className="mt-1 text-sm text-sub">Review employee leave requests.</p></div>
                      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-zinc-700 text-left"><tr><th className="px-6 py-4 font-medium text-sub">Employee</th><th className="px-6 py-4 font-medium text-sub">Dates</th><th className="px-6 py-4 font-medium text-sub">Reason</th><th className="px-6 py-4 font-medium text-sub">Status</th><th className="px-6 py-4 font-medium text-sub">Actions</th></tr></thead><tbody>{leaveList.map((leave) => <tr key={leave.id} className="border-b border-zinc-800 last:border-none"><td className="px-6 py-4 text-ink">{leave.staffEmail}</td><td className="px-6 py-4 text-sub">{leave.startDate} to {leave.endDate}</td><td className="px-6 py-4 text-sub">{leave.reason}</td><td className="px-6 py-4"><StatusBadge status={leave.status} />{leave.decisionNote ? <p className="mt-1 text-xs text-sub">{leave.decisionNote}</p> : null}</td><td className="px-6 py-4">{leave.status === 'pending' ? <div className="flex gap-2"><button onClick={() => updateLeaveStatus(leave.id, 'approved')} className="text-sm text-green-400">Approve</button><button onClick={() => updateLeaveStatus(leave.id, 'rejected')} className="text-sm text-red-400">Reject</button></div> : null}</td></tr>)}</tbody></table></div>
                    </div>
                  ),
                  payroll: (
                    <div className="surface rounded-lg">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 p-6">
                        <div>
                          <p className="text-lg font-semibold text-ink">Payroll Processing</p>
                          <p className="mt-1 text-sm text-sub">Monthly salary is paid in full. Approved timesheets are shown for reference only.</p>
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
                              <th className="px-6 py-4 font-medium text-sub">Approved work days</th>
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
                                <td className="px-6 py-4 text-sub">{p.approvedWorkDays}</td>
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
                          <div><p className="text-base font-semibold text-ink">Change admin password</p><p className="mt-1 text-sm text-sub">Use at least 12 characters.</p></div>
                        </div>
                        <div className="mt-5 space-y-4">
                          <div><label htmlFor="adminCurrentPassword" className="label-upper mb-2 block text-ghost">Current password</label><input id="adminCurrentPassword" type="password" value={adminCurrentPassword} onChange={(event) => setAdminCurrentPassword(event.target.value)} className={inputClass} required /></div>
                          <div><label htmlFor="adminNewPassword" className="label-upper mb-2 block text-ghost">New password</label><input id="adminNewPassword" type="password" minLength={12} value={adminNewPassword} onChange={(event) => setAdminNewPassword(event.target.value)} className={inputClass} required /></div>
                          <div><label htmlFor="adminConfirmPassword" className="label-upper mb-2 block text-ghost">Confirm new password</label><input id="adminConfirmPassword" type="password" minLength={12} value={adminConfirmPassword} onChange={(event) => setAdminConfirmPassword(event.target.value)} className={inputClass} required /></div>
                        </div>
                        <button type="submit" disabled={loading} className="mt-5 flex h-10 items-center justify-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Update password</button>
                      </form>

                      <div className="surface rounded-lg p-6 sm:p-7">
                        <p className="text-base font-semibold text-ink">Security Policy</p>
                        <div className="mt-5 space-y-4">
                          <div><label htmlFor="sessionHours" className="label-upper mb-2 block text-ghost">Session duration</label><select id="sessionHours" value={securitySettings.sessionHours} onChange={(event) => setSecuritySettings((current) => ({ ...current, sessionHours: Number(event.target.value) as SecuritySettings['sessionHours'] }))} className={inputClass}>{[1, 4, 8, 12, 24].map((hours) => <option key={hours} value={hours}>{hours} hour{hours === 1 ? '' : 's'}</option>)}</select></div>
                          <div><label htmlFor="minPasswordLength" className="label-upper mb-2 block text-ghost">Minimum password length</label><input id="minPasswordLength" type="number" min="12" max="64" value={securitySettings.minPasswordLength} onChange={(event) => setSecuritySettings((current) => ({ ...current, minPasswordLength: Number(event.target.value) || 12 }))} className={inputClass} /></div>
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
                          placeholder="At least 8 characters"
                          minLength={8}
                          required
                        />
                        <button type="button" onClick={() => setShowNewPassword((visible) => !visible)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ghost transition-colors hover:bg-zinc-800 hover:text-ink" aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}>
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
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
                        <DashboardMetric icon={<ClipboardList className="h-5 w-5" />} label="Pending timesheets" value={pendingTimesheets.length} detail="Waiting for admin review" />
                        <DashboardMetric icon={<ReceiptText className="h-5 w-5" />} label="Pending expenses" value={pendingExpenses.length} detail="Waiting for admin review" />
                        <DashboardMetric icon={<CheckCircle2 className="h-5 w-5" />} label="Approved expenses" value={`Rs. ${approvedExpenseTotal.toLocaleString('en-IN')}`} detail="Reimbursable total approved" />
                      </div>
                      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
                        <div className="surface rounded-lg p-6 sm:p-7">
                          <div className="flex items-center justify-between gap-4">
                            <div><p className="text-lg font-semibold text-ink">Recent activity</p><p className="mt-1 text-sm text-sub">Your latest submissions and decisions.</p></div>
                          </div>
                          <div className="mt-5 divide-y divide-zinc-200">
                            {loading ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-[#4d9144]" /></div> : recentActivity.length === 0 ? <p className="py-8 text-sm text-sub">No submissions yet. Start with an expense or timesheet.</p> : recentActivity.map((item, index) => <div key={`${item.type}-${index}`} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-medium text-ink">{item.type}: {item.title}</p><p className="mt-1 text-xs text-sub">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently submitted'}</p></div><StatusBadge status={item.status} /></div>)}
                          </div>
                        </div>
                        <div className="surface rounded-lg p-6 sm:p-7">
                          <p className="text-lg font-semibold text-ink">Submit work</p>
                          <p className="mt-1 text-sm leading-6 text-sub">Send your records for admin approval.</p>
                          <div className="mt-5 grid gap-3">
                            <button type="button" onClick={() => setActiveTab('timesheets')} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-[#66B159]">Submit timesheet <ClipboardList className="h-4 w-4 text-[#4d9144]" /></button>
                            <button type="button" onClick={() => setActiveTab('expenses')} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-[#66B159]">Submit expense <ReceiptText className="h-4 w-4 text-[#4d9144]" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                  properties: <ClientServicesPanel properties={propertyList} onboardings={onboardingList} loading={loading} onPropertiesChange={setPropertyList} onOnboardingsChange={setOnboardingList} readOnly />,
                  expenses: (
                    <div className="staff-workspace space-y-6 text-left">
                      <form className="staff-work-card rounded-lg p-6 sm:p-7" onSubmit={submitExpense}>
                        <div className="mb-6">
                          <p className="text-lg font-semibold text-ink">Submit Expense</p>
                          <p className="mt-1 text-sm text-sub">Expenses are sent to admin as pending approvals.</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="expenseCity" className="label-upper mb-2 block text-ghost">
                              City{expenseSettings.cityRequired ? ' *' : ''}
                            </label>
                            <input id="expenseCity" value={expenseCity} onChange={(event) => setExpenseCity(event.target.value)} className={inputClass} required={expenseSettings.cityRequired} />
                          </div>
                          <div>
                            <label htmlFor="expenseType" className="label-upper mb-2 block text-ghost">Expense type</label>
                            <select id="expenseType" value={expenseType} onChange={(event) => setExpenseType(event.target.value as typeof expenseType)} className={inputClass}>
                              <option value="travel">Travel</option><option value="food">Food</option><option value="fuel">Fuel</option><option value="other">Other</option>
                            </select>
                          </div>
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
                          <p className="mt-2 text-xs text-sub">Use a shareable Drive link or other secure receipt URL. Files are not stored in Firebase.</p>
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
                                <th className="px-6 py-4 font-medium text-sub">Amount</th>
                                <th className="px-6 py-4 font-medium text-sub">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loading ? (
                                <tr><td colSpan={3} className="py-10 text-center text-sub"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                              ) : expenseList.length === 0 ? (
                                <tr><td colSpan={3} className="py-10 text-center text-sub">No expenses submitted yet.</td></tr>
                              ) : (
                                expenseList.map((expense) => (
                                  <tr key={expense.id} className="border-b border-zinc-800 last:border-none">
                                    <td className="px-6 py-4">
                                      <p className="font-medium text-ink">{expense.expenseType}</p>
                                      <p className="text-xs text-sub">{expense.city || 'No city'}{expense.receiptUrl ? ' · Receipt link added' : ''}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sub">₹{expense.amount.toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4"><StatusBadge status={expense.status} />{expense.decisionNote ? <p className="mt-1 max-w-48 text-xs text-sub">{expense.decisionNote}</p> : null}{expense.approvedAt || expense.rejectedAt ? <p className="mt-1 text-xs text-sub">{new Date(expense.approvedAt || expense.rejectedAt || '').toLocaleDateString('en-IN')}</p> : null}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ),
                  timesheets: (
                    <div className="staff-workspace space-y-6 text-left">
                      <form className="staff-work-card rounded-lg p-6 sm:p-7" onSubmit={submitTimesheet}>
                        <div className="mb-6">
                          <p className="text-lg font-semibold text-ink">Submit Timesheet</p>
                          <p className="mt-1 text-sm text-sub">Select your work week, then choose the days you worked.</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="timesheetWorkDate" className="label-upper mb-2 block text-ghost">
                              Week starts (Sunday)
                            </label>
                            <DatePickerInput id="timesheetWorkDate" value={timesheetWorkDate} onChange={(value) => {
                              setTimesheetWorkDate(value)
                              setTimesheetWorkedDates([])
                              const start = new Date(`${value}T00:00:00`)
                              if (value && !Number.isNaN(start.getTime()) && start.getDay() === 0) {
                                start.setDate(start.getDate() + 6)
                                const year = start.getFullYear()
                                const month = String(start.getMonth() + 1).padStart(2, '0')
                                const day = String(start.getDate()).padStart(2, '0')
                                setTimesheetWeekEnd(`${year}-${month}-${day}`)
                              } else {
                                setTimesheetWeekEnd('')
                              }
                            }} className={inputClass} required />
                          </div>
                          <div>
                            <label htmlFor="timesheetWeekEnd" className="label-upper mb-2 block text-ghost">Week ends (Saturday)</label>
                            <DatePickerInput id="timesheetWeekEnd" value={timesheetWeekEnd} onChange={setTimesheetWeekEnd} className={inputClass} min={timesheetWorkDate || undefined} required />
                          </div>
                          <div>
                            <label htmlFor="timesheetLocation" className="label-upper mb-2 block text-ghost">Work location</label>
                            <select id="timesheetLocation" value={timesheetLocation} onChange={(event) => setTimesheetLocation(event.target.value as 'remote' | 'office')} className={inputClass}><option value="remote">Remote</option><option value="office">Office</option></select>
                          </div>
                        </div>
                        {timesheetWorkDate ? <fieldset className="mt-5">
                          <legend className="label-upper mb-3 block text-ghost">Days worked</legend>
                          {new Date(`${timesheetWorkDate}T00:00:00`).getDay() !== 0 ? <p className="text-sm text-red-600">Please choose a Sunday as the week start.</p> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                            {weekDays.map((day) => {
                              const selected = timesheetWorkedDates.includes(day.value)
                              return <label key={day.value} className={`cursor-pointer rounded-lg border px-3 py-3 text-center transition-colors ${selected ? 'border-[#66B159] bg-[#66B159]/15 text-[#36722f]' : 'border-zinc-200 bg-white text-ink hover:border-[#66B159]/60'}`}>
                                <input type="checkbox" checked={selected} onChange={() => setTimesheetWorkedDates((current) => selected ? current.filter((date) => date !== day.value) : [...current, day.value])} className="sr-only" />
                                <span className="block text-xs font-semibold">{day.label}</span><span className="mt-1 block text-xs opacity-70">{day.day}</span>
                              </label>
                            })}
                          </div>}
                        </fieldset> : null}
                        <div className="mt-4">
                          <label htmlFor="timesheetNotes" className="label-upper mb-2 block text-ghost">
                            Notes (optional)
                          </label>
                          <textarea
                            id="timesheetNotes"
                            rows={3}
                            value={timesheetNotes}
                            onChange={(event) => setTimesheetNotes(event.target.value)}
                            className={`${inputClass} h-auto resize-none py-3`}
                          />
                        </div>

                        {message && <p className="mt-5 rounded-lg border border-[#66B159]/30 bg-[#66B159]/10 px-4 py-3 text-sm text-ink">{message}</p>}
                        {error && <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

                        <button
                          type="submit"
                          disabled={loading}
                          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-[#FFFCFC] transition-colors hover:bg-[#73bd66] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                          Submit timesheet
                        </button>
                      </form>

                      <div className="staff-work-card rounded-lg">
                        <div className="border-b border-zinc-800 p-6">
                          <p className="text-lg font-semibold text-ink">My Timesheets</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="border-b border-zinc-700 text-left">
                              <tr>
                                <th className="px-6 py-4 font-medium text-sub">Week</th>
                                <th className="px-6 py-4 font-medium text-sub">Worked days</th>
                                <th className="px-6 py-4 font-medium text-sub">Location</th>
                                <th className="px-6 py-4 font-medium text-sub">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loading ? (
                                <tr><td colSpan={4} className="py-10 text-center text-sub"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                              ) : timesheetList.length === 0 ? (
                                <tr><td colSpan={4} className="py-10 text-center text-sub">No timesheets submitted yet.</td></tr>
                              ) : (
                                timesheetList.map((timesheet) => (
                                  <tr key={timesheet.id} className="border-b border-zinc-800 last:border-none">
                                    <td className="px-6 py-4">
                                      <p className="font-medium text-ink">{timesheet.weekStart || timesheet.workDate} to {timesheet.weekEnd || timesheet.workDate}</p>
                                      {timesheet.notes ? <p className="text-xs text-sub">{timesheet.notes}</p> : null}
                                    </td>
                                    <td className="px-6 py-4 text-sub">{timesheet.workedDates.length ? timesheet.workedDates.map((date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })).join(', ') : 'Not recorded'}</td>
                                    <td className="px-6 py-4 text-sub">{timesheet.workLocation}</td>
                                    <td className="px-6 py-4"><StatusBadge status={timesheet.status} />{timesheet.decisionNote ? <p className="mt-1 max-w-48 text-xs text-sub">{timesheet.decisionNote}</p> : null}{timesheet.approvedAt || timesheet.rejectedAt ? <p className="mt-1 text-xs text-sub">{new Date(timesheet.approvedAt || timesheet.rejectedAt || '').toLocaleDateString('en-IN')}</p> : null}</td>
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
                      <form className="staff-work-card rounded-lg p-6 sm:p-7" onSubmit={submitLeaveRequest}><p className="text-lg font-semibold text-ink">Request Leave</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label className="label-upper mb-2 block text-ghost">Start date</label><DatePickerInput value={leaveStartDate} onChange={setLeaveStartDate} className={inputClass} required /></div><div><label className="label-upper mb-2 block text-ghost">End date</label><DatePickerInput value={leaveEndDate} onChange={setLeaveEndDate} className={inputClass} min={leaveStartDate || undefined} required /></div></div><div className="mt-4"><label className="label-upper mb-2 block text-ghost">Reason</label><textarea value={leaveReason} onChange={(event) => setLeaveReason(event.target.value)} className={`${inputClass} h-auto resize-none py-3`} rows={3} required /></div><button type="submit" className="mt-5 h-11 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white">Submit leave request</button></form>
                      <div className="staff-work-card rounded-lg"><div className="border-b border-zinc-800 p-6"><p className="text-lg font-semibold text-ink">My Leave Requests</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-zinc-700 text-left"><tr><th className="px-6 py-4 font-medium text-sub">Dates</th><th className="px-6 py-4 font-medium text-sub">Reason</th><th className="px-6 py-4 font-medium text-sub">Status</th></tr></thead><tbody>{leaveList.map((leave) => <tr key={leave.id} className="border-b border-zinc-800"><td className="px-6 py-4 text-ink">{leave.startDate} to {leave.endDate}</td><td className="px-6 py-4 text-sub">{leave.reason}</td><td className="px-6 py-4"><StatusBadge status={leave.status} />{leave.decisionNote ? <p className="mt-1 text-xs text-sub">{leave.decisionNote}</p> : null}</td></tr>)}</tbody></table></div></div>
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
  if (/business development|sales|bdm/.test(`${role} ${department}`)) return {
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
  const today = new Date()
  const initialDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
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
    const displayDate = (value: string) => value.split('-').reverse().join('-')
    const escapeValue = (value: string | number) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
    const annualCtc = staff.annualCtc || 0
    const roleContent = getOfferRoleContent(staff.role || '', staff.department || '')
    const values: Record<string, string | number> = {
      offer_date: displayDate(offerDate),
      joining_date: displayDate(joiningDate),
      employee_name: staff.name,
      employee_email: staff.personalEmail || '',
      role: staff.role || '',
      department: staff.department || '',
      location,
      role_summary: roleContent.summary,
      annual_ctc: annualCtc.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      monthly_salary: (annualCtc / 12).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
    }
    const populated = Object.entries(values).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, escapeValue(value)), template)
    const responsibilities = roleContent.responsibilities.map((item) => `<li>${escapeValue(item)}</li>`).join('')
    return populated.replaceAll('{{key_responsibilities}}', responsibilities)
  }, [joiningDate, location, offerDate, staff, template])

  async function downloadOffer() {
    const previewDocument = iframeRef.current?.contentDocument
    const pages = previewDocument ? Array.from(previewDocument.querySelectorAll('.offer-page')) as HTMLElement[] : []
    if (!previewDocument || pages.length === 0) return
    setDownloading(true)
    setError('')
    try {
      const images = pages.flatMap((page) => Array.from(page.querySelectorAll('img')))
      await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => resolve(), { once: true })
      })))
      await previewDocument.fonts?.ready
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      for (let index = 0; index < pages.length; index += 1) {
        // Render at roughly 380 DPI on an A4 page so small offer-letter text
        // remains crisp when viewed at 100% or printed.
        const canvas = await html2canvas(pages[index], { scale: 4, useCORS: true, backgroundColor: '#ffffff', logging: false })
        if (index > 0) pdf.addPage('a4', 'portrait')
        // Every offer section is exactly A4. Exact origin placement prevents a
        // fractional vertical shift, and PNG preserves crisp text baselines.
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
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
                <input id="edit-staffDepartment" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label htmlFor="edit-staffRole" className="label-upper mb-2 block text-ghost">Role</label>
                <input id="edit-staffRole" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label htmlFor="edit-staffAnnualCtc" className="label-upper mb-2 block text-ghost">Annual CTC</label>
                <input id="edit-staffAnnualCtc" type="number" inputMode="decimal" min="0.01" step="0.01" value={annualCtc} onChange={(e) => setAnnualCtc(e.target.value)} className={inputClass} required />
              </div>
            </div>
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

function DashboardQueueRow({ label, count, action, onClick }: { label: string; count: number; action: string; onClick: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-1 text-xs text-sub">{count === 0 ? 'Nothing waiting right now' : `${count} awaiting approval`}</p>
      </div>
      <button type="button" onClick={onClick} className="text-sm font-semibold text-[#4d9144] hover:text-[#36722f]">{action}</button>
    </div>
  )
}

const StatusBadge = ({ status }: { status: 'pending' | 'approved' | 'rejected' }) => {
  const statusStyles = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${statusStyles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
