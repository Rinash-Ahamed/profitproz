'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Eye, EyeOff, KeyRound, Loader2, Plus, Trash2, X } from 'lucide-react'
import type { ClientPlatformCredential } from '@/lib/client-credentials'
import { authenticatedFetch as fetch } from '@/lib/client-api'
import type { PropertyRecord } from '@/lib/firestore'
import { OTA_PLATFORMS } from '@/lib/onboarding'

export function PropertyCredentialsModal({ property, onClose }: { property: PropertyRecord; onClose: () => void }) {
  const [credentials, setCredentials] = useState<ClientPlatformCredential[]>([])
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const endpoint = `/api/admin/properties/${encodeURIComponent(property.id)}/credentials`
  const inputClass = 'h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-ink placeholder:text-ghost focus:border-[#66B159] focus:outline-none'

  useEffect(() => {
    const controller = new AbortController()
    fetch(endpoint, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { credentials?: ClientPlatformCredential[]; message?: string }
        if (!response.ok) throw new Error(data.message || 'Failed to load platform credentials.')
        setCredentials(data.credentials || [])
      })
      .catch((caught) => {
        if ((caught as Error).name !== 'AbortError') setError(caught instanceof Error ? caught.message : 'Failed to load platform credentials.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [endpoint])

  function addCredential() {
    setCredentials((current) => [...current, { id: crypto.randomUUID(), platform: '', username: '', password: '', notes: '' }])
  }

  function updateCredential(id: string, field: keyof Omit<ClientPlatformCredential, 'id'>, value: string) {
    setCredentials((current) => current.map((credential) => credential.id === id ? { ...credential, [field]: value } : credential))
  }

  function removeCredential(id: string) {
    setCredentials((current) => current.filter((credential) => credential.id !== id))
    setVisiblePasswords((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }

  function togglePassword(id: string) {
    setVisiblePasswords((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials }),
      })
      const data = await response.json() as { credentials?: ClientPlatformCredential[]; message?: string }
      if (!response.ok || !data.credentials) throw new Error(data.message || 'Failed to save platform credentials.')
      setCredentials(data.credentials)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to save platform credentials.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div className="surface w-full max-w-4xl rounded-xl shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5 sm:px-6">
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold text-ink"><KeyRound className="h-5 w-5 text-[#66B159]" /> Platform credentials</p>
            <p className="mt-1 text-sm text-sub">{property.name} · Admin-only encrypted storage</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md text-sub hover:bg-zinc-800 hover:text-ink" aria-label="Close platform credentials"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 sm:p-6">
          {loading ? <div className="flex min-h-40 items-center justify-center text-sub"><Loader2 className="h-6 w-6 animate-spin" /></div> : null}
          {!loading && credentials.length === 0 ? <div className="rounded-lg border border-dashed border-zinc-700 px-5 py-8 text-center"><KeyRound className="mx-auto h-7 w-7 text-ghost" /><p className="mt-3 font-medium text-ink">No platform credentials stored</p><p className="mt-1 text-sm text-sub">Add Booking.com or any other client platform account.</p></div> : null}
          {!loading ? (
            <div className="space-y-4">
              {credentials.map((credential, index) => (
                <section key={credential.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">Platform {index + 1}</p>
                    <button type="button" onClick={() => removeCredential(credential.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-sub hover:bg-red-500/20 hover:text-red-400" aria-label={`Remove ${credential.platform || `platform ${index + 1}`}`} title="Remove credential"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="label-upper mb-2 block text-ghost">Platform *</span>
                      <select value={credential.platform} onChange={(event) => updateCredential(credential.id, 'platform', event.target.value)} className={inputClass}>
                        <option value="">Select platform</option>
                        {OTA_PLATFORMS.filter((platform) => platform === credential.platform || !credentials.some((item) => item.id !== credential.id && item.platform === platform)).map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                      </select>
                    </label>
                    <label><span className="label-upper mb-2 block text-ghost">Username / email *</span><input value={credential.username} onChange={(event) => updateCredential(credential.id, 'username', event.target.value)} maxLength={254} autoComplete="off" className={inputClass} /></label>
                    <label>
                      <span className="label-upper mb-2 block text-ghost">Password (optional)</span>
                      <span className="relative block">
                        <input type={visiblePasswords.has(credential.id) ? 'text' : 'password'} value={credential.password} onChange={(event) => updateCredential(credential.id, 'password', event.target.value)} maxLength={500} autoComplete="new-password" className={`${inputClass} pr-11`} />
                        <button type="button" onClick={() => togglePassword(credential.id)} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded text-sub hover:text-ink" aria-label={`${visiblePasswords.has(credential.id) ? 'Hide' : 'Show'} password for ${credential.platform || `platform ${index + 1}`}`}>{visiblePasswords.has(credential.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      </span>
                    </label>
                    <label><span className="label-upper mb-2 block text-ghost">Notes</span><input value={credential.notes} onChange={(event) => updateCredential(credential.id, 'notes', event.target.value)} maxLength={500} className={inputClass} placeholder="Account ID or recovery note" /></label>
                  </div>
                </section>
              ))}
            </div>
          ) : null}

          {error ? <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={addCredential} disabled={loading || credentials.length >= OTA_PLATFORMS.length} className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-700 px-3 text-sm font-semibold text-sub hover:border-zinc-600 hover:text-ink disabled:opacity-50"><Plus className="h-4 w-4" /> Add platform</button>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="h-10 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-sub hover:text-ink">Cancel</button>
              <button type="button" onClick={save} disabled={loading || saving} className="inline-flex h-10 min-w-28 items-center justify-center gap-2 rounded-md bg-[#66B159] px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save credentials'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
