'use client'

import Image from 'next/image'
import { FormEvent, useEffect, useState } from 'react'
import { Check, Copy, Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { apiFetch } from '@/lib/client-api'
import { useAppDialog } from '@/components/ui/AppDialogProvider'

type MfaStatus = {
  enabled: boolean
  enabledAt: string | null
  recoveryCodesRemaining: number
}

type SetupResponse = {
  secret: string
  qrCodeDataUrl: string
  setupToken: string
}

export function AdminMfaSettings({ onMessage, onError }: { onMessage: (message: string) => void; onError: (message: string) => void }) {
  const { confirmAction } = useAppDialog()
  const [status, setStatus] = useState<MfaStatus | null>(null)
  const [setup, setSetup] = useState<SetupResponse | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [code, setCode] = useState('')
  const [showEnable, setShowEnable] = useState(false)
  const [showDisable, setShowDisable] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<MfaStatus>('/api/admin/mfa', { signal: controller.signal })
      .then(setStatus)
      .catch((caught) => { if (!controller.signal.aborted) onError(caught instanceof Error ? caught.message : 'Unable to load MFA settings.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [onError])

  async function beginSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    try {
      const data = await apiFetch<SetupResponse>('/api/admin/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword }),
      })
      setSetup(data)
      setCurrentPassword('')
      setCode('')
      setShowEnable(false)
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Unable to start MFA setup.')
    } finally {
      setLoading(false)
    }
  }

  async function enableMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!setup) return
    setLoading(true)
    try {
      const data = await apiFetch<{ enabled: true; recoveryCodes: string[]; recoveryCodesRemaining: number }>('/api/admin/mfa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupToken: setup.setupToken, code }),
      })
      setStatus({ enabled: true, enabledAt: new Date().toISOString(), recoveryCodesRemaining: data.recoveryCodesRemaining })
      setRecoveryCodes(data.recoveryCodes)
      setSetup(null)
      setCode('')
      onMessage('Multi-factor authentication enabled.')
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Unable to enable MFA.')
    } finally {
      setLoading(false)
    }
  }

  async function disableMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!await confirmAction({ title: 'Turn off MFA?', message: 'Your Admin account will return to password-only login. Existing recovery codes will be permanently removed.', confirmLabel: 'Turn off MFA', tone: 'danger' })) return
    setLoading(true)
    try {
      const data = await apiFetch<MfaStatus>('/api/admin/mfa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, code }),
      })
      setStatus(data)
      setCurrentPassword('')
      setCode('')
      setShowDisable(false)
      setRecoveryCodes([])
      onMessage('Multi-factor authentication turned off.')
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Unable to turn off MFA.')
    } finally {
      setLoading(false)
    }
  }

  async function copyRecoveryCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'))
      setCopied(true)
    } catch {
      onError('Copy failed. Select and save the recovery codes manually.')
    }
  }

  if (loading && !status && !setup) return <div className="surface flex min-h-28 items-center justify-center rounded-lg"><Loader2 className="h-5 w-5 animate-spin text-[#66B159]" /></div>

  return (
    <div className="surface rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${status?.enabled ? 'bg-[#66B159]/10 text-[#66B159]' : 'bg-zinc-800 text-sub'}`}>{status?.enabled ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}</div>
          <div><p className="text-base font-semibold text-ink">Admin multi-factor authentication</p><p className="mt-1 text-sm text-sub">{status?.enabled ? 'Enabled for your Admin account.' : 'Add an authenticator code after your existing password.'}</p></div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${status?.enabled ? 'border-green-500/25 bg-green-500/10 text-green-400' : 'border-zinc-700 bg-zinc-900 text-sub'}`}>{status?.enabled ? 'On' : 'Off'}</span>
      </div>

      {recoveryCodes.length > 0 ? <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="font-semibold text-amber-200">Save these one-time recovery codes now</p>
        <p className="mt-1 text-xs leading-5 text-amber-100/75">They will not be shown again. Keep them somewhere secure and separate from your password.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">{recoveryCodes.map((recoveryCode) => <code key={recoveryCode} className="rounded border border-amber-500/20 bg-zinc-950/60 px-3 py-2 text-center text-sm tracking-wider text-ink">{recoveryCode}</code>)}</div>
        <button type="button" onClick={copyRecoveryCodes} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-amber-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-amber-300">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy recovery codes'}</button>
        <button type="button" onClick={() => setRecoveryCodes([])} className="ml-3 h-10 px-3 text-sm font-medium text-amber-100 hover:text-white">I saved them</button>
      </div> : null}

      {setup ? <form className="mt-4 border-t border-zinc-800 pt-4" onSubmit={enableMfa}>
        <p className="font-semibold text-ink">Connect your authenticator app</p>
        <p className="mt-2 text-sm leading-6 text-sub">Scan this QR code with Google Authenticator, Microsoft Authenticator, 1Password, or another TOTP app.</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="w-fit rounded-xl bg-white p-2"><Image src={setup.qrCodeDataUrl} alt="ProfitPro MFA setup QR code" width={200} height={200} unoptimized /></div>
          <div className="min-w-0"><p className="label-upper text-ghost">Manual setup key</p><code className="mt-2 block break-all rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm tracking-wider text-ink">{setup.secret}</code><p className="mt-3 text-xs leading-5 text-sub">Account: your Admin email · Type: time-based · 6 digits</p></div>
        </div>
        <div className="mt-4 max-w-sm"><label htmlFor="mfaSetupCode" className="label-upper mb-2 block text-ghost">Enter the six-digit code</label><input id="mfaSetupCode" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-center font-mono text-lg tracking-[0.3em] text-ink focus:border-[#66B159] focus:outline-none" required pattern="\d{6}" /></div>
        <div className="mt-4 flex flex-wrap gap-3"><button type="submit" disabled={loading || code.length !== 6} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Verify and turn on</button><button type="button" onClick={() => { setSetup(null); setCode('') }} className="h-9 rounded-lg border border-zinc-700 px-4 text-sm font-medium text-sub hover:text-ink">Cancel</button></div>
      </form> : null}

      {!status?.enabled && !setup ? showEnable ? <form className="mt-4 max-w-md border-t border-zinc-800 pt-4" onSubmit={beginSetup}><label htmlFor="mfaEnablePassword" className="label-upper mb-2 block text-ghost">Confirm current Admin password</label><input id="mfaEnablePassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm text-ink focus:border-[#66B159] focus:outline-none" required /><div className="mt-3 flex gap-3"><button type="submit" disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Continue setup</button><button type="button" onClick={() => { setShowEnable(false); setCurrentPassword('') }} className="h-9 px-3 text-sm text-sub hover:text-ink">Cancel</button></div></form> : <button type="button" onClick={() => setShowEnable(true)} className="mt-4 h-9 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white hover:bg-[#73bd66]">Turn on MFA</button> : null}

      {status?.enabled ? <div className="mt-4 border-t border-zinc-800 pt-4">
        <p className="text-sm text-sub">Recovery codes remaining: <span className="font-semibold text-ink">{status.recoveryCodesRemaining}</span></p>
        {showDisable ? <form className="mt-4 max-w-md space-y-3" onSubmit={disableMfa}><div><label htmlFor="mfaDisablePassword" className="label-upper mb-2 block text-ghost">Current Admin password</label><input id="mfaDisablePassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm text-ink focus:border-red-400 focus:outline-none" required /></div><div><label htmlFor="mfaDisableCode" className="label-upper mb-2 block text-ghost">Authenticator or recovery code</label><input id="mfaDisableCode" value={code} onChange={(event) => setCode(event.target.value.slice(0, 32))} autoComplete="one-time-code" className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm text-ink focus:border-red-400 focus:outline-none" required /></div><div className="flex gap-3"><button type="submit" disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Turn off MFA</button><button type="button" onClick={() => { setShowDisable(false); setCurrentPassword(''); setCode('') }} className="h-9 px-3 text-sm text-sub hover:text-ink">Cancel</button></div></form> : <button type="button" onClick={() => setShowDisable(true)} className="mt-3 h-9 rounded-lg border border-red-500/40 px-4 text-sm font-semibold text-red-400 hover:bg-red-500/10">Turn off MFA</button>}
      </div> : null}
    </div>
  )
}
