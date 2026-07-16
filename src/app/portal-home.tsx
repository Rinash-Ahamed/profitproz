'use client'

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Building2, CheckCircle2, ClipboardList, Edit, FileDown, Filter, KeyRound, Loader2, LogOut, ReceiptText, RefreshCw, Trash2, User, UserPlus, Users, XCircle } from 'lucide-react'
import type { SessionUser } from '@/lib/auth'
import type { ExpenseFieldSettings, ExpenseRecord, LeaveRequestRecord, PropertyRecord, PublicStaffRecord, SalaryRecord, SecuritySettings, TimesheetRecord } from '@/lib/firestore'
import { getVersionLabel, type AppVersion } from '@/lib/version'
import { PropertiesPanel } from '@/app/properties-panel'

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
  const [staffEmployeeId, setStaffEmployeeId] = useState('')
  const [staffDepartment, setStaffDepartment] = useState('')
  const [staffRole, setStaffRole] = useState('')
  const [staffCtc, setStaffCtc] = useState('')
  // Staff list state
  const [staffList, setStaffList] = useState<PublicStaffRecord[]>([])
  const [salaryList, setSalaryList] = useState<SalaryRecord[]>([])
  const [editingStaff, setEditingStaff] = useState<PublicStaffRecord | null>(null)
  const [propertyList, setPropertyList] = useState<PropertyRecord[]>([])
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
      fetch('/api/admin/properties')
        .then((res) => res.json())
        .then((data) => { if (data.properties) setPropertyList(data.properties) })
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
      fetch('/api/properties')
        .then((res) => res.json())
        .then((data) => { if (data.properties) setPropertyList(data.properties) })
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
        body: JSON.stringify({ firstName: staffFirstName, lastName: staffLastName, annualCtc: Number(staffCtc), employeeId: staffEmployeeId, department: staffDepartment, role: staffRole }),
      })
      const data = (await response.json()) as { message?: string; initialPassword?: string; staff: PublicStaffRecord }

      if (!response.ok) {
        setError(data.message || 'Unable to add employee.')
        return
      }

      setStaffFirstName('')
      setStaffLastName('')
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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sub transition-colors hover:bg-zinc-700 hover:text-ink"
          >
            <User className="h-5 w-5" />
          </button>
          {isProfileOpen && (
            <div className="surface absolute right-0 top-12 w-64 rounded-lg p-4 shadow-2xl">
              <p className="mb-3 truncate text-sm text-ink">{user.email}</p>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sub transition-colors hover:bg-zinc-800 hover:text-ink"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </button>
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
                              <p className="mt-1 text-sm text-sub">New employees receive a random one-time password and must change it after first login.</p>
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
                                Employee email (auto-generated)
                              </label>
                              <input id="staffEmail" value={emailFromStaffName(staffFirstName)} className={`${inputClass} bg-zinc-950 text-sub`} readOnly />
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
                              <input id="staffRole" value={staffRole} onChange={(e) => setStaffRole(e.target.value)} className={inputClass} placeholder="e.g., Revenue Manager" required />
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
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="border-b border-zinc-700 text-left">
                                <tr>
                                  <th className="px-6 py-4 font-medium text-sub">Name</th>
                                  <th className="px-6 py-4 font-medium text-sub">Employee ID</th>
                                  <th className="px-6 py-4 font-medium text-sub">Contact details</th>
                                  <th className="px-6 py-4 font-medium text-sub">Department</th>
                                  <th className="px-6 py-4 font-medium text-sub">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {loading ? (
                                  <tr>
                                     <td colSpan={5} className="py-10 text-center text-sub">
                                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                    </td>
                                  </tr>
                                ) : (
                                  staffList.map((staff) => (
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
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                          <button type="button" onClick={() => setEditingStaff(staff)} className="h-8 w-8 flex items-center justify-center rounded-md text-sub hover:bg-zinc-800 hover:text-ink transition-colors" aria-label={`Edit ${staff.name}`}><Edit className="h-4 w-4" /></button>
                                          <button type="button" onClick={() => handleResetPassword(staff.id, staff.name)} className="h-8 w-8 flex items-center justify-center rounded-md text-sub hover:bg-amber-500/20 hover:text-amber-400 transition-colors" aria-label={`Reset password for ${staff.name}`}><RefreshCw className="h-4 w-4" /></button>
                                          <button type="button" onClick={() => handleDeleteStaff(staff.id, staff.name)} className="h-8 w-8 flex items-center justify-center rounded-md text-sub hover:bg-red-500/20 hover:text-red-400 transition-colors" aria-label={`Delete ${staff.name}`}><Trash2 className="h-4 w-4" /></button>
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
                  properties: <PropertiesPanel properties={propertyList} loading={loading} onChange={setPropertyList} />,
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
                      <input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        className={inputClass}
                        placeholder="Temporary password"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="label-upper mb-2 block text-ghost">
                        New password
                      </label>
                      <input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className={inputClass}
                        placeholder="At least 12 characters"
                        required
                      />
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
                      <input id="emergencyContactName" value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} className={inputClass} placeholder="Name of emergency contact" required />
                    </div>
                    <div>
                      <label htmlFor="emergencyContactPhone" className="label-upper mb-2 block text-ghost">Emergency contact phone</label>
                      <input id="emergencyContactPhone" type="tel" inputMode="numeric" pattern="[0-9]{7,15}" maxLength={15} value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value.replace(/\D/g, ''))} className={inputClass} placeholder="Digits only" required />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="profileDetails" className="label-upper mb-2 block text-ghost">Additional details</label>
                    <textarea id="profileDetails" rows={3} value={profileDetails} onChange={(event) => setProfileDetails(event.target.value)} className={`${inputClass} h-auto resize-none py-3`} placeholder="Emergency contact, role details, or other relevant information" required />
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
                  properties: <PropertiesPanel properties={propertyList} loading={loading} onChange={setPropertyList} readOnly />,
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
                          <p className="mt-1 text-sm text-sub">Select a Sunday-to-Saturday week, then mark the days you worked.</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="timesheetWorkDate" className="label-upper mb-2 block text-ghost">
                              Week starts (Sunday)
                            </label>
                            <input id="timesheetWorkDate" type="date" value={timesheetWorkDate} onChange={(event) => { setTimesheetWorkDate(event.target.value); setTimesheetWorkedDates([]) }} className={inputClass} required />
                          </div>
                          <div>
                            <label htmlFor="timesheetWeekEnd" className="label-upper mb-2 block text-ghost">Week ends (Saturday)</label>
                            <input id="timesheetWeekEnd" type="date" value={timesheetWeekEnd} onChange={(event) => setTimesheetWeekEnd(event.target.value)} className={inputClass} required />
                          </div>
                          <div>
                            <label htmlFor="timesheetLocation" className="label-upper mb-2 block text-ghost">Work location</label>
                            <select id="timesheetLocation" value={timesheetLocation} onChange={(event) => setTimesheetLocation(event.target.value as 'remote' | 'office')} className={inputClass}><option value="remote">Remote</option><option value="office">Office</option></select>
                          </div>
                        </div>
                        <fieldset className="mt-5">
                          <legend className="label-upper mb-3 block text-ghost">Days worked</legend>
                          {!timesheetWorkDate ? <p className="text-sm text-sub">Choose the Sunday your work week starts to select dates.</p> : new Date(`${timesheetWorkDate}T00:00:00`).getDay() !== 0 ? <p className="text-sm text-red-600">Please choose a Sunday as the week start.</p> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                            {weekDays.map((day) => {
                              const selected = timesheetWorkedDates.includes(day.value)
                              return <label key={day.value} className={`cursor-pointer rounded-lg border px-3 py-3 text-center transition-colors ${selected ? 'border-[#66B159] bg-[#66B159]/15 text-[#36722f]' : 'border-zinc-200 bg-white text-ink hover:border-[#66B159]/60'}`}>
                                <input type="checkbox" checked={selected} onChange={() => setTimesheetWorkedDates((current) => selected ? current.filter((date) => date !== day.value) : [...current, day.value])} className="sr-only" />
                                <span className="block text-xs font-semibold">{day.label}</span><span className="mt-1 block text-xs opacity-70">{day.day}</span>
                              </label>
                            })}
                          </div>}
                        </fieldset>
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
                      <form className="staff-work-card rounded-lg p-6 sm:p-7" onSubmit={submitLeaveRequest}><p className="text-lg font-semibold text-ink">Request Leave</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label className="label-upper mb-2 block text-ghost">Start date</label><input type="date" value={leaveStartDate} onChange={(event) => setLeaveStartDate(event.target.value)} className={inputClass} required /></div><div><label className="label-upper mb-2 block text-ghost">End date</label><input type="date" value={leaveEndDate} onChange={(event) => setLeaveEndDate(event.target.value)} className={inputClass} required /></div></div><div className="mt-4"><label className="label-upper mb-2 block text-ghost">Reason</label><textarea value={leaveReason} onChange={(event) => setLeaveReason(event.target.value)} className={`${inputClass} h-auto resize-none py-3`} rows={3} required /></div><button type="submit" className="mt-5 h-11 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white">Submit leave request</button></form>
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
    </main>
  )
}

function EditStaffModal({ staff, onClose, onSave }: { staff: PublicStaffRecord; onClose: () => void; onSave: (staff: PublicStaffRecord) => void }) {
  const [name, setName] = useState(staff.name)
  const [email, setEmail] = useState(staff.email)
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
                <label htmlFor="edit-staffEmail" className="label-upper mb-2 block text-ghost">Employee email</label>
                <input id="edit-staffEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
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
                <input id="edit-staffRole" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} placeholder="e.g., Revenue Manager" required />
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
