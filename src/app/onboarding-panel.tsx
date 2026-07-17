'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, ChevronDown, Download, Edit, FileText, Loader2, Plus, Save, Search, Trash2 } from 'lucide-react'
import { OTA_PLATFORMS, type OnboardingPlatformProgress, type OnboardingRecord, type OtaPlatform } from '@/lib/onboarding'
import { DatePickerInput } from '@/components/ui/DatePickerInput'

type OnboardingPanelProps = {
  onboardings: OnboardingRecord[]
  loading: boolean
  onChange: (onboardings: OnboardingRecord[]) => void
  readOnly?: boolean
}

export function OnboardingPanel({ onboardings, loading, onChange, readOnly = false }: OnboardingPanelProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<OnboardingRecord | null>(null)
  const [invoiceRecord, setInvoiceRecord] = useState<OnboardingRecord | null>(null)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const visibleOnboardings = useMemo(() => {
    const query = search.trim().toLowerCase()
    return onboardings
      .filter((record) => !query || record.propertyName.toLowerCase().includes(query))
      .sort((a, b) => {
        if (query) {
          const rankDifference = Number(!a.propertyName.toLowerCase().startsWith(query)) - Number(!b.propertyName.toLowerCase().startsWith(query))
          if (rankDifference) return rankDifference
        }
        return a.propertyName.localeCompare(b.propertyName)
      })
  }, [onboardings, search])

  async function deleteRecord(record: OnboardingRecord) {
    if (!window.confirm(`Delete the OTA onboarding tracker for ${record.propertyName}?`)) return
    setDeletingId(record.id)
    setError('')
    try {
      const response = await fetch(`/api/admin/onboardings/${encodeURIComponent(record.id)}`, { method: 'DELETE', credentials: 'same-origin' })
      const data = await response.json() as { message?: string }
      if (!response.ok) throw new Error(data.message || 'Failed to delete onboarding tracker.')
      onChange(onboardings.filter((item) => item.id !== record.id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to delete onboarding tracker.')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="space-y-5">
      <div className="surface flex flex-wrap items-center justify-between gap-4 rounded-lg p-6">
        <div>
          <p className="text-lg font-semibold text-ink">OTA Onboarding</p>
          <p className="mt-1 text-sm text-sub">{readOnly ? 'View each selected platform and its current onboarding progress.' : 'Track every selected platform from Pending to Live.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-64 max-w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-sm text-ink placeholder:text-ghost focus:border-[#66B159] focus:outline-none" placeholder="Search property name" aria-label="Search OTA onboarding properties" />
          </label>
          {!readOnly ? <button type="button" onClick={() => setShowCreate(true)} className="flex h-11 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white hover:bg-[#73bd66]">
            <Plus className="h-4 w-4" /> Add onboarding property
          </button> : null}
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      {loading ? (
        <div className="surface flex min-h-52 items-center justify-center rounded-lg"><Loader2 className="h-6 w-6 animate-spin text-sub" /></div>
      ) : visibleOnboardings.length === 0 ? (
        <div className="surface rounded-lg px-6 py-12 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 font-medium text-ink">{search ? 'No matching properties' : 'No onboarding properties yet'}</p>
          {!search ? <p className="mt-1 text-sm text-sub">Add a property and select the OTA platforms it needs.</p> : null}
        </div>
      ) : (
        <div className="surface divide-y divide-zinc-800 overflow-hidden rounded-lg">
          {visibleOnboardings.map((record) => {
            const liveCount = record.platforms.filter((platform) => platform.status === 'live').length
            const expanded = expandedId === record.id
            return (
              <section key={record.id}>
                <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <button type="button" onClick={() => setExpandedId(expanded ? '' : record.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <ChevronDown className={`h-4 w-4 shrink-0 text-sub transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{record.propertyName}</span>
                      <span className="mt-0.5 block text-xs text-sub">{liveCount}/{record.platforms.length} live · {record.platforms.length - liveCount} pending</span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${liveCount === record.platforms.length ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-400'}`}>
                      {liveCount === record.platforms.length ? 'Completed' : 'In progress'}
                    </span>
                    {!readOnly && liveCount === record.platforms.length ? <button type="button" onClick={() => setInvoiceRecord(record)} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#66B159]/30 bg-[#66B159]/10 px-3 text-xs font-semibold text-[#66B159] transition-colors hover:bg-[#66B159]/20"><FileText className="h-4 w-4" /> Generate invoice</button> : null}
                    {!readOnly ? <button type="button" onClick={() => setEditing(record)} className="flex h-9 w-9 items-center justify-center rounded-md text-sub transition-colors hover:bg-zinc-800 hover:text-ink" aria-label={`Edit onboarding details for ${record.propertyName}`}>
                      <Edit className="h-4 w-4" />
                    </button> : null}
                    {!readOnly ? <button type="button" disabled={deletingId === record.id} onClick={() => deleteRecord(record)} className="flex h-9 w-9 items-center justify-center rounded-md text-sub transition-colors hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50" aria-label={`Delete onboarding for ${record.propertyName}`}>
                      {deletingId === record.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button> : null}
                  </div>
                </div>

                {expanded ? <div className="grid gap-4 border-t border-zinc-800 bg-zinc-950/20 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {record.platforms.map((progress) => (
                    <PlatformProgressCard
                      key={progress.platform}
                      onboardingId={record.id}
                      progress={progress}
                      readOnly={readOnly}
                      onSaved={(updated) => onChange(onboardings.map((item) => item.id === updated.id ? updated : item))}
                    />
                  ))}
                </div> : null}
              </section>
            )
          })}
        </div>
      )}

      {showCreate ? <OnboardingDetailsModal onClose={() => setShowCreate(false)} onSaved={(record) => { onChange([...onboardings, record].sort((a, b) => a.propertyName.localeCompare(b.propertyName))); setExpandedId(record.id); setShowCreate(false) }} /> : null}
      {editing ? <OnboardingDetailsModal initial={editing} onClose={() => setEditing(null)} onSaved={(record) => { onChange(onboardings.map((item) => item.id === record.id ? record : item).sort((a, b) => a.propertyName.localeCompare(b.propertyName))); setEditing(null) }} /> : null}
      {invoiceRecord ? <InvoiceModal record={invoiceRecord} onClose={() => setInvoiceRecord(null)} /> : null}
    </div>
  )
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function displayDate(value: string) {
  return value.split('-').reverse().join('-')
}

function escapeInvoiceValue(value: string | number) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

type InvoicePaymentSettings = {
  accountName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  upiVpa: string
  upiNumber: string
  companyAddress: string
}

const emptyInvoicePaymentSettings: InvoicePaymentSettings = {
  accountName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  upiVpa: '',
  upiNumber: '',
  companyAddress: '',
}

function InvoiceModal({ record, onClose }: { record: OnboardingRecord; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [invoiceDate, setInvoiceDate] = useState(localIsoDate())
  const [template, setTemplate] = useState('')
  const [paymentSettings, setPaymentSettings] = useState<InvoicePaymentSettings>(emptyInvoicePaymentSettings)
  const [invoiceSequence, setInvoiceSequence] = useState(0)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const dueDate = invoiceDate
  const [year, month] = invoiceDate.split('-')
  const invoiceNumber = `PP-OTA-${month}-${year.slice(-2)}-${String(invoiceSequence).padStart(3, '0')}`
  const subtotal = record.ratePerPlatform * record.platforms.length

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch('/template/ProfitPro_OTA_Onboarding_Invoice_Template.html', { signal: controller.signal }),
      fetch('/api/admin/invoice-settings', { signal: controller.signal }),
      fetch(`/api/admin/onboardings/${encodeURIComponent(record.id)}/invoice-number`, { method: 'POST', credentials: 'same-origin', signal: controller.signal }),
    ])
      .then(async ([templateResponse, settingsResponse, sequenceResponse]) => {
        if (!templateResponse.ok) throw new Error('Invoice template could not be loaded.')
        if (!settingsResponse.ok) throw new Error('Invoice payment details could not be loaded.')
        if (!sequenceResponse.ok) throw new Error('Invoice number could not be assigned.')
        const settingsData = await settingsResponse.json() as { settings?: InvoicePaymentSettings }
        const sequenceData = await sequenceResponse.json() as { sequence?: number }
        if (!Number.isInteger(sequenceData.sequence) || (sequenceData.sequence || 0) < 1) throw new Error('Invoice number could not be assigned.')
        setTemplate(await templateResponse.text())
        setPaymentSettings(settingsData.settings || emptyInvoicePaymentSettings)
        setInvoiceSequence(sequenceData.sequence!)
      })
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Invoice template could not be loaded.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [record.id])

  const renderedInvoice = useMemo(() => {
    if (!template || !invoiceSequence) return ''
    const values: Record<string, string | number> = {
      invoice_number: invoiceNumber,
      invoice_date: displayDate(invoiceDate),
      due_date: displayDate(dueDate),
      client_name: record.clientName,
      property_name: record.propertyName,
      property_address: record.propertyAddress,
      email_address: record.emailAddress,
      phone: record.phone,
      platform_list: record.platforms.map((progress) => progress.platform).join(', '),
      platform_count: record.platforms.length,
      rate_per_platform: record.ratePerPlatform.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      subtotal: subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      total_amount: subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      notes: record.invoiceNotes || 'OTA onboarding completed successfully across all selected platforms.',
      account_name: paymentSettings.accountName,
      bank_name: paymentSettings.bankName,
      account_number: paymentSettings.accountNumber,
      ifsc_code: paymentSettings.ifscCode,
      upi_vpa: paymentSettings.upiVpa,
      upi_number: paymentSettings.upiNumber,
      company_address: paymentSettings.companyAddress,
    }
    return Object.entries(values).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, escapeInvoiceValue(value)), template)
  }, [dueDate, invoiceDate, invoiceNumber, invoiceSequence, paymentSettings, record, subtotal, template])

  async function downloadPdf() {
    const document = iframeRef.current?.contentDocument
    const page = document?.querySelector('.invoice-page') as HTMLElement | null
    if (!document || !page) return
    setDownloading(true)
    setError('')
    try {
      const images = Array.from(page.querySelectorAll('img'))
      await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => resolve(), { once: true })
      })))
      await document.fonts?.ready

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const canvas = await html2canvas(page, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      // The template is exactly A4. Placing it at the exact page origin avoids
      // fractional centering offsets, while PNG keeps small text edges lossless.
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
      pdf.save(`${invoiceNumber}.pdf`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to download invoice PDF.')
    } finally {
      setDownloading(false)
    }
  }

  const inputClass = 'h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none'

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/75 px-3 py-5 backdrop-blur-sm sm:px-6">
      <div className="surface w-full max-w-6xl overflow-hidden rounded-xl shadow-2xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 p-5 sm:px-6">
          <div>
            <p className="text-lg font-semibold text-ink">Generate onboarding invoice</p>
            <p className="mt-1 text-sm text-sub">{record.propertyName} · {invoiceNumber}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block w-44">
              <span className="label-upper mb-2 block text-ghost">Invoice date</span>
              <DatePickerInput value={invoiceDate} onChange={setInvoiceDate} className={inputClass} required />
            </label>
            <div className="w-36">
              <span className="label-upper mb-2 block text-ghost">Due date</span>
              <div className="flex h-11 items-center rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-sub">{displayDate(dueDate)}</div>
            </div>
            <button type="button" onClick={downloadPdf} disabled={loading || downloading || Boolean(error)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {downloading ? 'Preparing…' : 'Download PDF'}
            </button>
            <button type="button" onClick={onClose} className="h-11 rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-sub hover:text-ink">Close</button>
          </div>
        </div>
        {error ? <p className="m-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
        <div className="max-h-[calc(100vh-9rem)] overflow-auto bg-zinc-950/60 p-3 sm:p-6">
          {loading ? <div className="flex min-h-96 items-center justify-center gap-3 text-sm text-sub"><Loader2 className="h-5 w-5 animate-spin" /> Loading invoice template…</div> : null}
          {!loading && renderedInvoice ? <iframe ref={iframeRef} title={`Invoice preview for ${record.propertyName}`} srcDoc={renderedInvoice} className="mx-auto h-[1123px] w-[794px] max-w-none border-0 bg-white" /> : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function PlatformProgressCard({ onboardingId, progress, onSaved, readOnly = false }: { onboardingId: string; progress: OnboardingPlatformProgress; onSaved: (record: OnboardingRecord) => void; readOnly?: boolean }) {
  const [status, setStatus] = useState(progress.status)
  const [notes, setNotes] = useState(progress.notes)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dirty = status !== progress.status || notes !== progress.notes

  useEffect(() => {
    setStatus(progress.status)
    setNotes(progress.notes)
  }, [progress.notes, progress.status])

  async function saveProgress() {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/onboardings/${encodeURIComponent(onboardingId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: progress.platform, status, notes }),
      })
      const data = await response.json() as { onboarding?: OnboardingRecord; message?: string }
      if (!response.ok || !data.onboarding) throw new Error(data.message || 'Failed to update platform progress.')
      onSaved(data.onboarding)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to update platform progress.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-ink">{progress.platform}</p>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status === 'live' ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-400'}`}>
          {status === 'live' ? 'Live' : 'Pending'}
        </span>
      </div>
      {readOnly ? <div className="mt-4"><p className="label-upper text-ghost">Notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-sub">{progress.notes || 'No notes added.'}</p></div> : <>
      <label className="mt-4 block">
        <span className="label-upper mb-2 block text-ghost">Status</span>
        <select value={status} onChange={(event) => setStatus(event.target.value as OnboardingPlatformProgress['status'])} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none">
          <option value="pending">Pending</option>
          <option value="live">Live</option>
        </select>
      </label>
      <label className="mt-3 block">
        <span className="label-upper mb-2 block text-ghost">Notes</span>
        <textarea rows={3} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-ink placeholder:text-ghost focus:border-[#66B159] focus:outline-none" placeholder="Account setup, verification, pending documents…" />
      </label>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
      <button type="button" onClick={saveProgress} disabled={!dirty || saving} className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-[#66B159] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save progress
      </button>
      </>}
    </div>
  )
}

function OnboardingDetailsModal({ initial, onClose, onSaved }: { initial?: OnboardingRecord; onClose: () => void; onSaved: (record: OnboardingRecord) => void }) {
  const [propertyName, setPropertyName] = useState(initial?.propertyName || '')
  const [clientName, setClientName] = useState(initial?.clientName || '')
  const [propertyAddress, setPropertyAddress] = useState(initial?.propertyAddress || '')
  const [emailAddress, setEmailAddress] = useState(initial?.emailAddress || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [ratePerPlatform, setRatePerPlatform] = useState(initial ? String(initial.ratePerPlatform) : '999')
  const [invoiceNotes, setInvoiceNotes] = useState(initial?.invoiceNotes || '')
  const [selectedPlatforms, setSelectedPlatforms] = useState<OtaPlatform[]>(initial?.platforms.map((progress) => progress.platform) || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function togglePlatform(platform: OtaPlatform) {
    setSelectedPlatforms((current) => current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch(initial ? `/api/admin/onboardings/${encodeURIComponent(initial.id)}` : '/api/admin/onboardings', {
        method: initial ? 'PATCH' : 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(initial ? { action: 'details' } : {}),
          propertyName,
          clientName,
          propertyAddress,
          emailAddress,
          phone,
          ratePerPlatform: Number(ratePerPlatform),
          invoiceNotes,
          platforms: selectedPlatforms,
        }),
      })
      const data = await response.json() as { onboarding?: OnboardingRecord; message?: string }
      if (!response.ok || !data.onboarding) throw new Error(data.message || `Failed to ${initial ? 'update' : 'add'} onboarding property.`)
      onSaved(data.onboarding)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Failed to ${initial ? 'update' : 'add'} onboarding property.`)
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="surface w-full max-w-3xl rounded-xl p-6 shadow-2xl sm:p-7">
        <div className="mb-6">
          <p className="text-lg font-semibold text-ink">{initial ? 'Edit' : 'Add'} onboarding property</p>
          <p className="mt-1 text-sm text-sub">Store the client details required for onboarding progress and invoice generation.</p>
        </div>
        <form onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label-upper mb-2 block text-ghost">Property name</span>
              <input value={propertyName} onChange={(event) => setPropertyName(event.target.value)} maxLength={160} className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none" required />
            </label>
            <label className="block">
              <span className="label-upper mb-2 block text-ghost">Client / authorized person</span>
              <input value={clientName} onChange={(event) => setClientName(event.target.value.replace(/\d/g, ''))} maxLength={120} className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none" required />
            </label>
            <label className="block">
              <span className="label-upper mb-2 block text-ghost">Billing email</span>
              <input type="email" value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} maxLength={254} className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none" required />
            </label>
            <label className="block">
              <span className="label-upper mb-2 block text-ghost">Contact phone</span>
              <input type="tel" inputMode="numeric" pattern="[0-9]{7,15}" maxLength={15} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))} className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none" placeholder="Digits only" required />
            </label>
            <label className="block sm:col-span-2">
              <span className="label-upper mb-2 block text-ghost">Property address</span>
              <textarea rows={2} value={propertyAddress} onChange={(event) => setPropertyAddress(event.target.value)} maxLength={500} className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-ink focus:border-[#66B159] focus:outline-none" required />
            </label>
            <label className="block">
              <span className="label-upper mb-2 block text-ghost">Rate per platform</span>
              <input type="number" inputMode="decimal" min="0" max="100000000" step="0.01" value={ratePerPlatform} onChange={(event) => setRatePerPlatform(event.target.value)} className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none" required />
            </label>
            <label className="block sm:col-span-2">
              <span className="label-upper mb-2 block text-ghost">Invoice notes (optional)</span>
              <textarea rows={2} value={invoiceNotes} onChange={(event) => setInvoiceNotes(event.target.value)} maxLength={1000} className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-ink focus:border-[#66B159] focus:outline-none" placeholder="Additional invoice information" />
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="label-upper mb-3 text-ghost">Platforms for onboarding</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {OTA_PLATFORMS.map((platform) => (
                <label key={platform} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${selectedPlatforms.includes(platform) ? 'border-[#66B159] bg-[#66B159]/10 text-ink' : 'border-zinc-700 text-sub hover:border-zinc-600'}`}>
                  <input type="checkbox" checked={selectedPlatforms.includes(platform)} onChange={() => togglePlatform(platform)} className="h-4 w-4 accent-[#66B159]" />
                  {platform}
                </label>
              ))}
            </div>
          </fieldset>

          {error ? <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
          <div className="mt-7 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="h-11 rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-sub hover:text-ink">Cancel</button>
            <button type="submit" disabled={saving || selectedPlatforms.length === 0} className="flex h-11 min-w-32 items-center justify-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {initial ? 'Save changes' : 'Add property'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
