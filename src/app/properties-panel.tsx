'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Building2, Download, Edit, FileText, Loader2, Plus, Search, Trash2, X } from 'lucide-react'
import type { PropertyInput, PropertyRecord } from '@/lib/firestore'
import { DatePickerInput } from '@/components/ui/DatePickerInput'

type PropertiesPanelProps = {
  properties: PropertyRecord[]
  loading: boolean
  onChange: (properties: PropertyRecord[]) => void
  readOnly?: boolean
}

const emptyProperty: PropertyInput = {
  name: '',
  propertyType: 'hotel',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  gstNumber: '',
  city: '',
  address: '',
  roomCount: 0,
  commissionPercent: 0,
  contractStartDate: '',
  signedContractUrl: '',
  status: 'pending',
  notes: '',
}

export function PropertiesPanel({ properties, loading, onChange, readOnly = false }: PropertiesPanelProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<PropertyRecord | null>(null)
  const [contractProperty, setContractProperty] = useState<PropertyRecord | null>(null)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const visibleProperties = useMemo(() => {
    const query = search.trim().toLowerCase()
    return properties
      .filter((property) => !query || property.name.toLowerCase().includes(query))
      .sort((a, b) => {
        if (query) {
          const rankDifference = Number(!a.name.toLowerCase().startsWith(query)) - Number(!b.name.toLowerCase().startsWith(query))
          if (rankDifference) return rankDifference
        }
        return a.name.localeCompare(b.name)
      })
  }, [properties, search])

  async function deleteRecord(property: PropertyRecord) {
    if (!window.confirm(`Delete ${property.name}? This permanently removes the property record.`)) return
    setDeletingId(property.id)
    setError('')
    try {
      const response = await fetch(`/api/admin/properties/${encodeURIComponent(property.id)}`, { method: 'DELETE' })
      const data = await response.json() as { message?: string }
      if (!response.ok) throw new Error(data.message || 'Failed to delete property.')
      onChange(properties.filter((item) => item.id !== property.id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to delete property.')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="space-y-5">
      <div className="surface flex flex-wrap items-center justify-between gap-4 rounded-lg p-6">
        <div>
          <p className="text-lg font-semibold text-ink">{readOnly ? 'Client Property Directory' : 'Our Clients'}</p>
          <p className="mt-1 text-sm text-sub">{readOnly ? 'View the hospitality properties served by ProfitPro.' : 'Manage hotels, resorts, stays, and other client properties.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-64 max-w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-sm text-ink placeholder:text-ghost focus:border-[#66B159] focus:outline-none" placeholder="Search property name" aria-label="Search revenue management properties" />
          </label>
          {!readOnly ? <button type="button" onClick={() => setShowCreate(true)} className="flex h-11 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white hover:bg-[#73bd66]">
            <Plus className="h-4 w-4" /> Add property
          </button> : null}
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <div className="surface rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-zinc-700 text-left">
              <tr>
                <th className="px-6 py-4 font-medium text-sub">Property</th>
                <th className="px-6 py-4 font-medium text-sub">Contact</th>
                <th className="px-6 py-4 font-medium text-sub">Rooms</th>
                <th className="px-6 py-4 font-medium text-sub">Commission</th>
                <th className="px-6 py-4 font-medium text-sub">Contract</th>
                <th className="px-6 py-4 font-medium text-sub">Status</th>
                {!readOnly ? <th className="px-6 py-4 font-medium text-sub">Agreement</th> : null}
                {!readOnly ? <th className="px-6 py-4 font-medium text-sub">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={readOnly ? 6 : 8} className="py-12 text-center text-sub"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
              ) : visibleProperties.length === 0 ? (
                <tr><td colSpan={readOnly ? 6 : 8} className="px-6 py-12 text-center"><Building2 className="mx-auto h-8 w-8 text-zinc-600" /><p className="mt-3 font-medium text-ink">{search ? 'No matching properties' : 'No client properties yet'}</p>{!readOnly && !search ? <p className="mt-1 text-sm text-sub">Add your first property to start the client register.</p> : null}</td></tr>
              ) : visibleProperties.map((property) => (
                <tr key={property.id} className="border-b border-zinc-800 last:border-none">
                  <td className="px-6 py-4"><p className="font-medium text-ink">{property.name}</p><p className="mt-1 text-xs capitalize text-sub">{property.propertyType.replace('-', ' ')} · {property.city}{property.address ? ` · ${property.address}` : ''}</p>{property.notes ? <p className="mt-2 max-w-72 whitespace-pre-wrap text-xs text-sub">{property.notes}</p> : null}</td>
                  <td className="px-6 py-4"><p className="text-ink">{property.contactName || 'Not provided'}</p>{property.contactEmail ? <p className="mt-1 text-xs text-sub">{property.contactEmail}</p> : null}{property.contactPhone ? <p className="mt-1 text-xs text-sub">{property.contactPhone}</p> : null}{!property.contactEmail && !property.contactPhone ? <p className="mt-1 text-xs text-sub">No contact details</p> : null}</td>
                  <td className="px-6 py-4 text-sub">{property.roomCount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 font-semibold text-[#66B159]">{property.commissionPercent}%</td>
                  <td className="px-6 py-4 text-sub"><p>{property.contractStartDate ? new Date(`${property.contractStartDate}T00:00:00`).toLocaleDateString('en-IN') : 'Not set'}</p>{!readOnly && property.signedContractUrl ? <a href={property.signedContractUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium text-[#66B159] hover:underline">View signed contract</a> : null}</td>
                  <td className="px-6 py-4"><PropertyStatusBadge status={property.status} /></td>
                  {!readOnly ? <td className="px-6 py-4">{property.signedContractUrl ? <span className="text-xs text-ghost">Signed</span> : <button type="button" onClick={() => setContractProperty(property)} className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-[#66B159]/30 bg-[#66B159]/10 px-3 text-xs font-semibold text-[#66B159] transition-colors hover:bg-[#66B159]/20"><FileText className="h-4 w-4" /> Contract PDF</button>}</td> : null}
                  {!readOnly ? <td className="px-6 py-4"><div className="flex gap-2"><button type="button" onClick={() => setEditing(property)} className="flex h-8 w-8 items-center justify-center rounded-md text-sub hover:bg-zinc-800 hover:text-ink" aria-label={`Edit ${property.name}`}><Edit className="h-4 w-4" /></button><button type="button" disabled={deletingId === property.id} onClick={() => deleteRecord(property)} className="flex h-8 w-8 items-center justify-center rounded-md text-sub hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50" aria-label={`Delete ${property.name}`}>{deletingId === property.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></div></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate ? <PropertyModal title="Add Client Property" initial={emptyProperty} onClose={() => setShowCreate(false)} onSaved={(property) => { onChange([...properties, property].sort((a, b) => a.name.localeCompare(b.name))); setShowCreate(false); setContractProperty(property) }} /> : null}
      {editing ? <PropertyModal title="Edit Client Property" initial={editing} propertyId={editing.id} onClose={() => setEditing(null)} onSaved={(property) => { onChange(properties.map((item) => item.id === property.id ? property : item).sort((a, b) => a.name.localeCompare(b.name))); setEditing(null) }} /> : null}
      {contractProperty ? <ContractPreviewModal property={contractProperty} onClose={() => setContractProperty(null)} /> : null}
    </div>
  )
}

function PropertyModal({ title, initial, propertyId, onClose, onSaved }: { title: string; initial: PropertyInput; propertyId?: string; onClose: () => void; onSaved: (property: PropertyRecord) => void }) {
  const [form, setForm] = useState<PropertyInput>({ ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputClass = 'h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink placeholder:text-ghost focus:border-[#66B159] focus:outline-none focus:ring-1 focus:ring-[#66B159]/40'
  const update = <K extends keyof PropertyInput>(field: K, value: PropertyInput[K]) => setForm((current) => ({ ...current, [field]: value }))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch(propertyId ? `/api/admin/properties/${encodeURIComponent(propertyId)}` : '/api/admin/properties', {
        method: propertyId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json() as { property?: PropertyRecord; message?: string }
      if (!response.ok || !data.property) throw new Error(data.message || 'Failed to save property.')
      onSaved(data.property)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to save property.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="surface w-full max-w-3xl rounded-xl p-6 shadow-2xl sm:p-7">
        <div className="mb-6"><p className="text-lg font-semibold text-ink">{title}</p><p className="mt-1 text-sm text-sub">Store the client and commercial agreement details.</p></div>
        <form onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Property name *"><input value={form.name} onChange={(e) => update('name', e.target.value)} maxLength={160} className={inputClass} required /></Field>
            <Field label="Property type *"><select value={form.propertyType} onChange={(e) => update('propertyType', e.target.value as PropertyInput['propertyType'])} className={inputClass} required><option value="hotel">Hotel</option><option value="resort">Resort</option><option value="homestay">Homestay / Stay</option><option value="serviced-apartment">Serviced apartment</option><option value="hostel">Hostel</option><option value="other">Other</option></select></Field>
            <Field label="City *"><input value={form.city} onChange={(e) => update('city', e.target.value)} maxLength={100} className={inputClass} required /></Field>
            <Field label="Contact person"><input value={form.contactName} onChange={(e) => update('contactName', e.target.value)} maxLength={100} className={inputClass} /></Field>
            <Field label="Contact email"><input type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} maxLength={254} className={inputClass} /></Field>
            <Field label="Contact phone"><input type="tel" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} maxLength={20} className={inputClass} placeholder="+91 98765 43210" /></Field>
            <Field label="GSTIN (if applicable)"><input value={form.gstNumber} onChange={(e) => update('gstNumber', e.target.value.toUpperCase())} minLength={15} maxLength={15} className={inputClass} placeholder="22AAAAA0000A1Z5" /></Field>
            <Field label="Number of rooms *"><input type="number" min="0" max="100000" step="1" value={form.roomCount} onChange={(e) => update('roomCount', Number(e.target.value))} className={inputClass} required /></Field>
            <Field label="Revenue commission % *"><input type="number" min="0" max="100" step="0.01" value={form.commissionPercent} onChange={(e) => update('commissionPercent', Number(e.target.value))} className={inputClass} required /></Field>
            <Field label="Contract start date"><DatePickerInput value={form.contractStartDate} onChange={(value) => update('contractStartDate', value)} className={inputClass} /></Field>
            <Field label="Signed contract link"><input type="url" inputMode="url" value={form.signedContractUrl} onChange={(e) => update('signedContractUrl', e.target.value)} maxLength={2048} className={inputClass} placeholder="https://..." /><span className="mt-1 block text-xs text-sub">Required before changing the status to Active.</span></Field>
            <Field label="Status"><select value={form.status} onChange={(e) => update('status', e.target.value as PropertyInput['status'])} className={inputClass}><option value="pending">Pending</option><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
            <Field label="Address" wide><input value={form.address} onChange={(e) => update('address', e.target.value)} maxLength={500} className={inputClass} /></Field>
            <Field label="Notes" wide><textarea rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} maxLength={2000} className={`${inputClass} h-auto resize-y py-3`} placeholder="Contract terms or other client details" /></Field>
          </div>
          {error ? <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
          <div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="h-11 rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-sub hover:text-ink">Cancel</button><button type="submit" disabled={saving} className="flex h-11 min-w-28 items-center justify-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save property'}</button></div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

function ContractPreviewModal({ property, onClose }: { property: PropertyRecord; onClose: () => void }) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadContract() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/admin/properties/${encodeURIComponent(property.id)}/contract`, { signal: controller.signal })
        if (!response.ok) {
          const data = await response.json().catch(() => ({})) as { message?: string }
          throw new Error(data.message || 'Failed to generate contract preview.')
        }

        const contract = await response.arrayBuffer()
        if (controller.signal.aborted || !previewRef.current) return
        const { renderAsync } = await import('docx-preview')
        previewRef.current.innerHTML = ''
        await renderAsync(contract, previewRef.current, undefined, {
          breakPages: true,
          ignoreHeight: false,
          ignoreWidth: false,
          renderHeaders: true,
          renderFooters: true,
          useBase64URL: true,
        })
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Failed to generate contract preview.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadContract()
    return () => controller.abort()
  }, [property.id, reloadKey])

  async function downloadPdf() {
    const preview = previewRef.current
    if (!preview || loading || error) return
    setDownloading(true)
    setError('')

    const wrapper = (preview.querySelector('.docx-wrapper') as HTMLElement | null) || preview
    const sections = Array.from(wrapper.querySelectorAll('section.docx')) as HTMLElement[]
    const wrapperStyle = wrapper.getAttribute('style')
    const sectionStyles = sections.map((section) => section.getAttribute('style'))

    try {
      wrapper.style.padding = '0'
      wrapper.style.background = '#ffffff'
      sections.forEach((section, index) => {
        section.style.margin = '0 auto'
        section.style.boxShadow = 'none'
        section.style.breakAfter = index === sections.length - 1 ? 'auto' : 'page'
      })

      const { default: html2pdf } = await import('html2pdf.js')
      const safeName = property.name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'property'
      await html2pdf().set({
        margin: 0,
        filename: `${safeName}-ProfitPro-Contract.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 4, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(wrapper).save()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to download the contract PDF.')
    } finally {
      if (wrapperStyle === null) wrapper.removeAttribute('style')
      else wrapper.setAttribute('style', wrapperStyle)
      sections.forEach((section, index) => {
        const style = sectionStyles[index]
        if (style === null) section.removeAttribute('style')
        else section.setAttribute('style', style)
      })
      setDownloading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/75 px-3 py-5 backdrop-blur-sm sm:px-6" onClick={onClose}>
      <div className="surface w-full max-w-6xl overflow-hidden rounded-xl shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-700 px-5 py-4 sm:px-6">
          <div>
            <p className="text-lg font-semibold text-ink">Contract preview</p>
            <p className="mt-1 text-sm text-sub">{property.name} · placeholders filled from the property record</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={downloadPdf} disabled={loading || downloading || Boolean(error)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#73bd66] disabled:cursor-not-allowed disabled:opacity-60">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? 'Preparing PDF…' : 'Download PDF'}
            </button>
            <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-sub hover:bg-zinc-800 hover:text-ink" aria-label="Close contract preview"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {error ? <div className="m-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:m-6"><span>{error}</span><button type="button" onClick={() => setReloadKey((current) => current + 1)} className="rounded-md border border-red-300/30 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-red-500/10">Retry preview</button></div> : null}
        <div className="max-h-[calc(100vh-9rem)] overflow-auto bg-zinc-950/60 p-3 sm:p-6">
          {loading ? <div className="flex min-h-96 items-center justify-center gap-3 text-sm text-sub"><Loader2 className="h-5 w-5 animate-spin" /> Generating contract preview…</div> : null}
          <div ref={previewRef} className={loading ? 'hidden' : 'mx-auto min-w-fit [&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper]:!p-0'} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? 'sm:col-span-2' : ''}><span className="label-upper mb-2 block text-ghost">{label}</span>{children}</label>
}

function PropertyStatusBadge({ status }: { status: PropertyRecord['status'] }) {
  const styles = {
    pending: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
    active: 'border-green-500/20 bg-green-500/10 text-green-400',
    inactive: 'border-zinc-600 bg-zinc-800 text-sub',
  }
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}
