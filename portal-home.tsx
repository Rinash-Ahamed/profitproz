'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, Edit, FileDown, Filter, KeyRound, Loader2, LogOut, RefreshCw, Trash2, User, UserPlus, XCircle } from 'lucide-react'
import type { SessionUser } from '@/lib/auth'
import type { StaffRecord, TimesheetRecord } from '@/lib/firestore'
import { getVersionLabel, type AppVersion } from '@/lib/version'

type PortalHomeProps = {
  user: SessionUser
  version: AppVersion
  title: string
  description: string
}

type PayrollRow = {
  employeeName: string
  employeeId: string
  department: string
  payrollPeriod: string
  monthlySalary: number
  workingDays: number
  daysPresent: number
  leaveDays: number
}

export function PortalHome({ user, version, title, description }: PortalHomeProps) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [staffSubTab, setStaffSubTab] = useState('all')
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Staff creation state
  const [staffName, setStaffName] = useState('')
  const [staffEmployeeId, setStaffEmployeeId] = useState('')
  const [staffDepartment, setStaffDepartment] = useState('')
  const [staffSalary, setStaffSalary] = useState('')
  // Staff list state
  const [staffList, setStaffList] = useState<StaffRecord[]>([])
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null)
  // Timesheet state
  const [timesheetList, setTimesheetList] = useState<TimesheetRecord[]>([])
  const [showTimesheetFilters, setShowTimesheetFilters] = useState(false)
  const [timesheetFilterEmployee, setTimesheetFilterEmployee] = useState('all')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [message])

  useEffect(() => {
    if (user.role === 'admin' && activeTab === 'staff') {
      setLoading(true)
      fetch('/api/admin/staff')
        .then((res) => res.json())
        .then((data) => {
          if (data.staff) {
            setStaffList(data.staff)
          }
        })
        .catch(() => setError('Could not load staff list.'))
        .finally(() => setLoading(false))
    }
    if (user.role === 'admin' && activeTab === 'timesheets') {
      setLoading(true)
      const promises = [fetch('/api/admin/timesheets')]
      // Also fetch staff for the filter dropdown if not already loaded
      if (staffList.length === 0) {
        promises.push(fetch('/api/admin/staff'))
      }

      Promise.all(promises)
        .then(async (responses) => {
          const [timesheetRes, staffRes] = responses
          const timesheetData = await timesheetRes.json()
          if (timesheetData.timesheets) {
            setTimesheetList(timesheetData.timesheets)
          }
          if (staffRes) {
            const staffData = await staffRes.json()
            if (staffData.staff) {
              setStaffList(staffData.staff)
            }
          }
        })
        .catch(() => setError('Could not load data for this view.'))
        .finally(() => setLoading(false))
    }
  }, [activeTab, user.role])

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
        body: JSON.stringify({ name: staffName, baseSalary: Number(staffSalary) || 0, employeeId: staffEmployeeId, department: staffDepartment }),
      })
      const data = (await response.json()) as { message?: string; initialPassword?: string; staff: StaffRecord }

      if (!response.ok) {
        setError(data.message || 'Unable to add staff.')
        return
      }

      setStaffName('')
      setStaffEmployeeId('')
      setStaffDepartment('')
      setStaffSalary('')
      setMessage('Staff added successfully.')
      // Refresh staff list with the new record from the API response
      setStaffList((prev) => [...prev, data.staff].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
    } catch {
      setError('Unable to add staff right now.')
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
        let errorMessage = 'Failed to delete staff member.'
        try {
          const data = await response.json()
          errorMessage = data.message || errorMessage
        } catch (e) {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      setStaffList((prev) => prev.filter((s) => s.id !== staffId))
      setMessage('Staff member deleted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(staffId: string, staffName: string) {
    if (!window.confirm(`Are you sure you want to reset the password for ${staffName}? Their password will be set to "Welcome@123" and they will be required to change it on next login.`)) {
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

      setMessage(`Password for ${staffName} has been reset to: ${data.newPassword}. Please share this with them securely.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTimesheetStatusUpdate(timesheetId: string, status: 'approved' | 'rejected') {
    const originalTimesheets = [...timesheetList]
    // Optimistic UI update
    setTimesheetList((prev) => prev.map((ts) => (ts.id === timesheetId ? { ...ts, status } : ts)))

    try {
      const response = await fetch(`/api/admin/timesheets/${timesheetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
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

  function handleExportPayroll() {
    if (mockPayroll.length === 0) {
      alert('No payroll data to export.')
      return
    }

    const headers: (keyof PayrollRow)[] = ['employeeName', 'employeeId', 'department', 'payrollPeriod', 'monthlySalary', 'workingDays', 'daysPresent', 'leaveDays']
    const headerRow = 'Employee Name,Employee ID,Department,Payroll Period,Monthly Salary,Working Days,Days Present,Leave Days'

    const csvRows = mockPayroll.map(row =>
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
        body: JSON.stringify({ currentPassword, newPassword }),
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
      setMessage('Password updated. You can continue using the Staff workspace.')
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

  const inputClass =
    'h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm text-ink placeholder:text-ghost transition-colors focus:border-[#66B159] focus:outline-none focus:ring-1 focus:ring-[#66B159]/40'

  const filteredTimesheets = useMemo(() => {
    if (timesheetFilterEmployee === 'all') {
      return timesheetList
    }
    return timesheetList.filter(ts => ts.staffEmail === timesheetFilterEmployee)
  }, [timesheetList, timesheetFilterEmployee])

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-1000 px-6 py-8 text-ink sm:px-10">
      <div className="ambient-glow left-[-8rem] top-[8rem] h-56 w-56" />
      <div className="ambient-glow right-[-6rem] bottom-[8rem] h-72 w-72" style={{ animationDelay: '2s' }} />

      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-8">
        <div className="flex flex-1 items-center justify-start">
          <Link href="/" className="inline-flex items-center">
            <Image src="/profitpro.png" alt="ProfitPro" width={190} height={78} className="h-14 w-auto object-contain" priority />
          </Link>
        </div>

        {user.role === 'admin' && (
          <nav className="hidden items-center rounded-full border border-zinc-800 bg-zinc-900/80 p-1 shadow-lg shadow-black/20 backdrop-blur-sm md:flex">
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
                Staff
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
                onClick={() => setActiveTab('payroll')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'payroll' ? 'bg-zinc-700 text-ink' : 'text-sub hover:text-ink/80'
                }`}
              >
                Payroll
              </button>
            </div>
          </nav>
        )}

        <div className="relative flex flex-1 items-center justify-end">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sub transition-colors hover:bg-zinc-700 hover:text-ink"
          >
            <User className="h-5 w-5" />
          </button>
          {isProfileOpen && (
            <div className="surface absolute right-0 top-12 w-64 rounded-lg p-4 shadow-2xl">
              <p className="truncate text-sm text-ink">{user.email}</p>
              <p className="mb-3 text-xs text-sub">Signed in as {user.role}</p>
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
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-ink sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-sub">{description}</p>

          {/* Mobile nav tabs */}
          {user.role === 'admin' && (
            <div className="mt-10 overflow-x-auto border-b border-zinc-800 md:hidden">
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
                  Staff
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
                  onClick={() => setActiveTab('payroll')}
                  className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'payroll' ? 'border-[#66B159] text-ink' : 'border-transparent text-sub hover:border-zinc-700'
                  }`}
                >
                  Payroll
                </button>
              </div>
            </div>
          )}

          <div className={`mt-10 w-full ${user.role === 'admin' && (activeTab === 'staff' || activeTab === 'timesheets' || activeTab === 'payroll') ? 'max-w-7xl' : 'max-w-3xl'}`}>
            {user.role === 'admin'
              ? {
                  dashboard: (
                    <div className="surface rounded-lg p-6 sm:p-7">
                      <p className="text-lg font-semibold text-ink">Admin Dashboard</p>
                      <p className="mt-1 text-sm text-sub">Work in progress. Management tools for staff, expenses, and salaries will appear here.</p>
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
                          All Staff
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
                              <p className="text-lg font-semibold text-ink">Add new staff member</p>
                              <p className="mt-1 text-sm text-sub">New staff start with Welcome@123 and must change it after first login.</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label htmlFor="staffName" className="label-upper mb-2 block text-ghost">
                                Staff name
                              </label>
                              <input id="staffName" autoComplete="off" value={staffName} onChange={(e) => setStaffName(e.target.value)} className={inputClass} required />
                            </div>
                            <div>
                              <label htmlFor="staffEmail" className="label-upper mb-2 block text-ghost">
                                Staff email (auto-generated)
                              </label>
                              <input id="staffEmail" value={emailFromStaffName(staffName)} className={`${inputClass} bg-zinc-950 text-sub`} readOnly />
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
                          </div>

                          <div className="mt-4">
                            <label htmlFor="staffSalary" className="label-upper mb-2 block text-ghost">
                              Base Salary (Monthly, Optional)
                            </label>
                            <input id="staffSalary" type="number" value={staffSalary} onChange={(e) => setStaffSalary(e.target.value)} className={inputClass} placeholder="e.g., 30000" />
                          </div>

                          {message && <p className="mt-5 rounded-lg border border-[#66B159]/30 bg-[#66B159]/10 px-4 py-3 text-sm text-ink">{message}</p>}
                          {error && <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

                          <button
                            type="submit"
                            disabled={loading}
                            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-[#FFFCFC] transition-colors hover:bg-[#73bd66] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none sm:w-auto sm:px-6"
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                            Add staff
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
                                  <th className="px-6 py-4 font-medium text-sub">Department</th>
                                  <th className="px-6 py-4 font-medium text-sub">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {loading ? (
                                  <tr>
                                    <td colSpan={4} className="py-10 text-center text-sub">
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
                                      <td className="px-6 py-4 text-sub">{staff.department || 'N/A'}</td>
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
                              <th className="px-6 py-4 font-medium text-sub">Date</th>
                              <th className="px-6 py-4 font-medium text-sub">Hours</th>
                              <th className="px-6 py-4 font-medium text-sub">Status</th>
                              <th className="px-6 py-4 font-medium text-sub">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loading ? (
                              <tr><td colSpan={5} className="py-10 text-center text-sub"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                            ) : (
                              filteredTimesheets.map((ts) => (
                                <tr key={ts.id} className="border-b border-zinc-800 last:border-none">
                                  <td className="px-6 py-4 text-ink">{ts.staffEmail}</td>
                                  <td className="px-6 py-4 text-sub">{ts.workDate}</td>
                                  <td className="px-6 py-4 text-sub">{ts.hours}</td>
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
                  payroll: (
                    <div className="surface rounded-lg">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 p-6">
                        <div>
                          <p className="text-lg font-semibold text-ink">Payroll Processing</p>
                          <p className="mt-1 text-sm text-sub">Generate payroll reports for salaried employees.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm text-sub transition-colors hover:bg-zinc-800">
                            June 2024
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
                              <th className="px-6 py-4 font-medium text-sub">Working Days</th>
                              <th className="px-6 py-4 font-medium text-sub">Present</th>
                              <th className="px-6 py-4 font-medium text-sub">Leave</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mockPayroll.map((p) => (
                              <tr key={p.employeeId} className="border-b border-zinc-800 last:border-none">
                                <td className="px-6 py-4">
                                  <p className="font-medium text-ink">{p.employeeName}</p>
                                  <p className="text-xs text-sub">{p.employeeId}</p>
                                </td>
                                <td className="px-6 py-4 text-sub">{p.department}</td>
                                <td className="px-6 py-4 text-sub">₹{p.monthlySalary.toLocaleString('en-IN')}</td>
                                <td className="px-6 py-4 text-sub">{p.workingDays}</td>
                                <td className="px-6 py-4 text-sub">{p.daysPresent}</td>
                                <td className="px-6 py-4 text-sub">{p.leaveDays}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
                      <p className="mt-1 text-sm text-sub">Use Welcome@123 as your current password, then set your own password.</p>
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
                        placeholder="Welcome@123"
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
                        placeholder="At least 8 characters"
                        required
                      />
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
                    Change password
                  </button>
                </form>
              ) : (
                <div className="surface rounded-lg p-6 sm:p-7">
                  <p className="text-lg font-semibold text-ink">Staff Dashboard</p>
                  <p className="mt-1 text-sm text-sub">Work in progress. Your profile, expenses, and timesheet tools will appear here.</p>
                </div>
              )}
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

const mockPayroll: PayrollRow[] = [
  { employeeName: 'John Doe', employeeId: 'PP12345', department: 'Tech', payrollPeriod: 'May 2024', monthlySalary: 50000, workingDays: 22, daysPresent: 21, leaveDays: 1 },
  { employeeName: 'Jane Smith', employeeId: 'PP67890', department: 'Sales', payrollPeriod: 'May 2024', monthlySalary: 60000, workingDays: 22, daysPresent: 22, leaveDays: 0 },
  { employeeName: 'Peter Jones', employeeId: 'PP54321', department: 'Marketing', payrollPeriod: 'May 2024', monthlySalary: 55000, workingDays: 22, daysPresent: 20, leaveDays: 2 },
]

function EditStaffModal({ staff, onClose, onSave }: { staff: StaffRecord; onClose: () => void; onSave: (staff: StaffRecord) => void }) {
  const [name, setName] = useState(staff.name)
  const [email, setEmail] = useState(staff.email)
  const [employeeId, setEmployeeId] = useState(staff.employeeId || '')
  const [department, setDepartment] = useState(staff.department || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputClass =
    'h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm text-ink placeholder:text-ghost transition-colors focus:border-[#66B159] focus:outline-none focus:ring-1 focus:ring-[#66B159]/40'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const updates = {
      ...(name !== staff.name && { name }),
      ...(email !== staff.email && { email }),
      ...(employeeId !== (staff.employeeId || '') && { employeeId }),
      ...(department !== (staff.department || '') && { department }),
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

      const data = (await response.json()) as { message?: string; staff?: StaffRecord }

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
            <p className="text-lg font-semibold text-ink">Edit Staff Member</p>
            <p className="mt-1 text-sm text-sub">Update the details for {staff.name}.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-staffName" className="label-upper mb-2 block text-ghost">Staff name</label>
                <input id="edit-staffName" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label htmlFor="edit-staffEmail" className="label-upper mb-2 block text-ghost">Staff email</label>
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