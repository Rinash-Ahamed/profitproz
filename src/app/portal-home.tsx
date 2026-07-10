'use client'

import { FormEvent, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { KeyRound, Loader2, LogOut, UserPlus } from 'lucide-react'
import type { SessionUser } from '@/lib/auth'
import { getVersionLabel, type AppVersion } from '@/lib/version'

type PortalHomeProps = {
  user: SessionUser
  version: AppVersion
  title: string
  description: string
}

export function PortalHome({ user, version, title, description }: PortalHomeProps) {
  const [staffName, setStaffName] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
        body: JSON.stringify({ name: staffName, email: staffEmail }),
      })
      const data = (await response.json()) as { message?: string; initialPassword?: string }

      if (!response.ok) {
        setError(data.message || 'Unable to add staff.')
        return
      }

      setStaffName('')
      setStaffEmail('')
      setMessage(`Staff added. Initial password: ${data.initialPassword || 'Welcome@123'}`)
    } catch {
      setError('Unable to add staff right now.')
    } finally {
      setLoading(false)
    }
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
        setError(data.message || 'Unable to change password.')
        return
      }

      setCurrentPassword('')
      setNewPassword('')
      setMessage('Password updated. You can continue using the Staff workspace.')
      window.location.reload()
    } catch {
      setError('Unable to change password right now.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm text-ink placeholder:text-ghost transition-colors focus:border-[#66B159] focus:outline-none focus:ring-1 focus:ring-[#66B159]/40'

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-1000 px-6 py-8 text-ink sm:px-10">
      <div className="ambient-glow left-[-8rem] top-[8rem] h-56 w-56" />
      <div className="ambient-glow right-[-6rem] bottom-[8rem] h-72 w-72" style={{ animationDelay: '2s' }} />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center">
          <Image src="/profitpro.png" alt="ProfitPro" width={190} height={78} className="h-14 w-auto object-contain" priority />
        </Link>
        <div className="flex items-center gap-3">
          <span className="max-w-[170px] truncate rounded-lg border border-zinc-700 px-3 py-2 text-xs text-sub sm:max-w-[240px]">
            Signed in as {user.email}
          </span>
          <span className="hidden rounded-lg border border-zinc-700 px-3 py-2 text-xs text-ghost sm:inline-flex">
            {getVersionLabel(version)}
          </span>
          <button
            type="button"
            onClick={logout}
            className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm text-sub transition-colors hover:border-[#66B159]/60 hover:text-ink"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Logout
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl items-center py-14">
        <div className="w-full">
          <div className="glass-pill mb-8 inline-flex items-center gap-2.5 rounded-full px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#66B159] pulse-dot" />
            <span className="label-upper text-ink/80">{user.role} portal</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-ink sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-sub">{description}</p>

          <div className="mt-10 max-w-2xl">
            {user.role === 'admin' ? (
              <form className="surface rounded-lg p-6 sm:p-7" onSubmit={addStaff}>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#66B159]/10 text-[#66B159]">
                    <UserPlus className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-ink">Add staff login</p>
                    <p className="mt-1 text-sm text-sub">New staff start with Welcome@123 and must change it after first login.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="staffName" className="label-upper mb-2 block text-ghost">
                      Staff name
                    </label>
                    <input
                      id="staffName"
                      value={staffName}
                      onChange={(event) => setStaffName(event.target.value)}
                      className={inputClass}
                      placeholder="Staff name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="staffEmail" className="label-upper mb-2 block text-ghost">
                      Staff email
                    </label>
                    <input
                      id="staffEmail"
                      type="email"
                      value={staffEmail}
                      onChange={(event) => setStaffEmail(event.target.value)}
                      className={inputClass}
                      placeholder="staff@profitproz.com"
                      required
                    />
                  </div>
                </div>

                {message && <p className="mt-5 rounded-lg border border-[#66B159]/30 bg-[#66B159]/10 px-4 py-3 text-sm text-ink">{message}</p>}
                {error && <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-[#FFFCFC] transition-colors hover:bg-[#73bd66] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Add staff
                </button>
              </form>
            ) : (
              <form className="surface rounded-lg p-6 sm:p-7" onSubmit={changePassword}>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#66B159]/10 text-[#66B159]">
                    <KeyRound className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-ink">
                      {user.mustChangePassword ? 'Change your initial password' : 'Staff workspace'}
                    </p>
                    <p className="mt-1 text-sm text-sub">
                      {user.mustChangePassword
                        ? 'Use Welcome@123 as your current password, then set your own password.'
                        : 'Your password is active. Staff tools can be added here next.'}
                    </p>
                  </div>
                </div>

                {user.mustChangePassword ? (
                  <>
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
                      className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-[#FFFCFC] transition-colors hover:bg-[#73bd66] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                      Change password
                    </button>
                  </>
                ) : null}
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
