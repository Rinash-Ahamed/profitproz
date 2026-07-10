'use client'

import { FormEvent, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react'

type LoginResponse = {
  message?: string
  redirectTo?: string
}

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = (await response.json()) as LoginResponse

      if (!response.ok || !data.redirectTo) {
        setError(data.message || 'Invalid email or password.')
        return
      }

      window.location.href = data.redirectTo
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen">
      <section className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_520px]">
        <div className="relative hidden lg:block">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
            src="/portal/team_video.mp4"
          />
          <div className="absolute inset-0 bg-zinc-950/70" />
          <div className="relative z-10 flex h-full flex-col justify-between p-10">
            <div className="inline-flex w-fit items-center">
              <Image src="/profitpro.png" alt="ProfitPro" width={220} height={90} className="h-16 w-auto object-contain" priority />
            </div>
            <div className="max-w-xl pb-10">
              <div className="glass-pill mb-8 inline-flex items-center gap-2.5 rounded-full px-4 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#66B159] pulse-dot" />
                <span className="label-upper text-white/80">Team access</span>
              </div>
              <h1 className="max-w-lg text-5xl font-bold leading-[1.02] tracking-tight text-white">
                Revenue operations <span className="text-[#66B159]">start here...</span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-white/70">
                Turn Portential Into Profit.
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-screen items-center justify-center bg-zinc-1000 px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center justify-between gap-4 lg:hidden">
              <div className="inline-flex items-center">
                <Image src="/profitpro.png" alt="ProfitPro" width={190} height={78} className="h-14 w-auto object-contain" priority />
              </div>
              <Link href="/" className="text-sm text-sub transition-colors hover:text-ink">
                Public site
              </Link>
            </div>
            <div className="surface rounded-lg p-7 shadow-2xl shadow-black/20 sm:p-8">
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#66B159]" />
                  <p className="label-upper text-[#66B159]">Secure login</p>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-ink">Login Portal</h2>
                <p className="mt-2 text-sm leading-6 text-sub">
                  Use the credentials assigned to your role.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="label-upper mb-2 block text-ghost">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost" aria-hidden="true" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-11 pr-4 text-sm text-ink placeholder:text-ghost transition-colors focus:border-[#66B159] focus:outline-none focus:ring-1 focus:ring-[#66B159]/40"
                      placeholder="name@profitproz.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="label-upper mb-2 block text-ghost">
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost" aria-hidden="true" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-11 pr-12 text-sm text-ink placeholder:text-ghost transition-colors focus:border-[#66B159] focus:outline-none focus:ring-1 focus:ring-[#66B159]/40"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ghost transition-colors hover:bg-zinc-800 hover:text-ink"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-200">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="glow-green flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-[#FFFCFC] transition-colors hover:bg-[#73bd66] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {loading ? 'Signing in' : 'Sign in'}
                </button>
              </form>
            </div>

            <div className="mt-6 hidden justify-center lg:flex">
              <Link href="/" className="text-sm text-sub transition-colors hover:text-ink">
                Go to public site
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
