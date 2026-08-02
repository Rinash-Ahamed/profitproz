'use client'

import { FormEvent, Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Building2, ChevronDown, ChevronRight, Download, Edit, ExternalLink, FileText, KeyRound, Loader2, Plus, Search, Trash2, X } from 'lucide-react'
import type { PropertyInput, PropertyRecord } from '@/lib/firestore'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { apiFetch, authenticatedFetch as fetch } from '@/lib/client-api'
import { formatDateOnlyDisplay, todayLocalDateOnly } from '@/lib/date-only'
import { escapeHtml } from '@/lib/html'
import { getPdfRenderScale, releasePdfCanvas, waitForPdfAssets } from '@/lib/client-pdf'
import { PropertyCredentialsModal } from './property-credentials-modal'

type PropertiesPanelProps = {
  properties: PropertyRecord[]
  loading: boolean
  onChange: (properties: PropertyRecord[]) => void
  readOnly?: boolean
  editorOnly?: boolean
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

export function PropertiesPanel({ properties, loading, onChange, readOnly = false, editorOnly = false }: PropertiesPanelProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<PropertyRecord | null>(null)
  const [contractProperty, setContractProperty] = useState<PropertyRecord | null>(null)
  const [invoiceProperty, setInvoiceProperty] = useState<PropertyRecord | null>(null)
  const [credentialsProperty, setCredentialsProperty] = useState<PropertyRecord | null>(null)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expandedPropertyId, setExpandedPropertyId] = useState('')
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
      if (expandedPropertyId === property.id) setExpandedPropertyId('')
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
          <a
            href="https://app-live.axisrooms.com/supplier/home.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center gap-2 rounded-lg border border-[#66B159]/40 bg-[#66B159]/10 px-4 text-sm font-semibold text-[#66B159] transition-colors hover:bg-[#66B159]/20"
            aria-label="Open AxisRooms channel manager login"
          >
            AxisRooms Login <ExternalLink className="h-4 w-4" />
          </a>
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
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-zinc-700 text-left">
              <tr>
                <th className="w-14 px-4 py-4"><span className="sr-only">Show details</span></th>
                <th className="px-6 py-4 font-medium text-sub">Property</th>
                <th className="px-6 py-4 font-medium text-sub">Contact</th>
                <th className="px-6 py-4 font-medium text-sub">Status</th>
                {!readOnly ? <th className="px-6 py-4 font-medium text-sub">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={readOnly ? 4 : 5} className="py-12 text-center text-sub"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
              ) : visibleProperties.length === 0 ? (
                <tr><td colSpan={readOnly ? 4 : 5} className="px-6 py-12 text-center"><Building2 className="mx-auto h-8 w-8 text-zinc-600" /><p className="mt-3 font-medium text-ink">{search ? 'No matching properties' : 'No client properties yet'}</p>{!readOnly && !search ? <p className="mt-1 text-sm text-sub">Add your first property to start the client register.</p> : null}</td></tr>
              ) : visibleProperties.map((property) => {
                const isExpanded = expandedPropertyId === property.id
                const detailsId = `revenue-property-details-${property.id}`
                return (
                  <Fragment key={property.id}>
                    <tr className={`border-b border-zinc-800 transition-colors ${isExpanded ? 'bg-zinc-900/70' : 'hover:bg-zinc-900/40'}`}>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setExpandedPropertyId(isExpanded ? '' : property.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-sub transition-colors hover:bg-zinc-800 hover:text-ink"
                          aria-expanded={isExpanded}
                          aria-controls={detailsId}
                          aria-label={`${isExpanded ? 'Hide' : 'Show'} details for ${property.name}`}
                          title={`${isExpanded ? 'Hide' : 'Show'} property details`}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button type="button" onClick={() => setExpandedPropertyId(isExpanded ? '' : property.id)} className="text-left">
                          <span className="block font-medium text-ink">{property.name}</span>
                          <span className="mt-1 block text-xs capitalize text-sub">{property.propertyType.replace('-', ' ')}{property.city ? ` · ${property.city}` : ''}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-ink">{property.contactName || 'Not provided'}</p>
                        <p className="mt-1 text-xs text-sub">{property.contactEmail || property.contactPhone || 'No contact details'}</p>
                      </td>
                      <td className="px-6 py-4"><PropertyStatusBadge status={property.status} /></td>
                      {!readOnly ? (
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {!editorOnly ? <button type="button" onClick={() => setCredentialsProperty(property)} className="flex h-9 w-9 items-center justify-center rounded-md text-sub hover:bg-[#66B159]/20 hover:text-[#66B159]" aria-label={`Manage platform credentials for ${property.name}`} title="Platform credentials"><KeyRound className="h-4 w-4" /></button> : null}
                            {!editorOnly && property.status === 'active' ? <button type="button" onClick={() => setInvoiceProperty(property)} className="flex h-9 w-9 items-center justify-center rounded-md text-sub hover:bg-[#66B159]/20 hover:text-[#66B159]" aria-label={`Generate revenue invoice for ${property.name}`} title="Generate revenue invoice"><FileText className="h-4 w-4" /></button> : null}
                            <button type="button" onClick={() => setEditing(property)} className="flex h-9 w-9 items-center justify-center rounded-md text-sub hover:bg-zinc-800 hover:text-ink" aria-label={`Edit ${property.name}`} title="Edit property"><Edit className="h-4 w-4" /></button>
                            {!editorOnly ? <button type="button" disabled={deletingId === property.id} onClick={() => deleteRecord(property)} className="flex h-9 w-9 items-center justify-center rounded-md text-sub hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50" aria-label={`Delete ${property.name}`} title="Delete property">{deletingId === property.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button> : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                    {isExpanded ? (
                      <tr id={detailsId} className="border-b border-zinc-800 bg-zinc-950/40">
                        <td colSpan={readOnly ? 4 : 5} className="px-6 py-5">
                          <div className="grid gap-4 md:grid-cols-3">
                            <PropertyDetailGroup title="Property details" items={[
                              { label: 'Type', value: property.propertyType.replace('-', ' '), capitalize: true },
                              { label: 'City', value: property.city || 'Not provided' },
                              { label: 'Address', value: property.address || 'Not provided' },
                              { label: 'Rooms', value: property.roomCount.toLocaleString('en-IN') },
                            ]} />
                            <PropertyDetailGroup title="Client contact" items={[
                              { label: 'Name', value: property.contactName || 'Not provided' },
                              { label: 'Email', value: property.contactEmail || 'Not provided' },
                              { label: 'Phone', value: property.contactPhone || 'Not provided' },
                              { label: 'GST', value: property.gstNumber || 'Not provided' },
                            ]} />
                            <PropertyDetailGroup title="Commercial & agreement" items={[
                              { label: 'Commission', value: `${property.commissionPercent}%`, accent: true },
                              { label: 'Effective date', value: property.contractStartDate ? formatDateOnlyDisplay(property.contractStartDate) : 'Not set' },
                              { label: 'Agreement', value: property.signedContractUrl ? 'Signed' : 'Pending' },
                            ]}>
                              {!readOnly && !editorOnly && property.signedContractUrl ? <a href={property.signedContractUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-medium text-[#66B159] hover:underline">View signed contract</a> : null}
                              {!readOnly && !editorOnly && !property.signedContractUrl ? <button type="button" onClick={() => setContractProperty(property)} className="mt-3 inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-[#66B159]/30 bg-[#66B159]/10 px-3 text-xs font-semibold text-[#66B159] transition-colors hover:bg-[#66B159]/20" aria-label={`Generate contract PDF for ${property.name}`} title="Generate contract PDF"><FileText className="h-4 w-4" /> Contract PDF</button> : null}
                            </PropertyDetailGroup>
                          </div>
                          {property.notes ? <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ghost">Notes</p><p className="mt-2 whitespace-pre-wrap text-sm text-sub">{property.notes}</p></div> : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate ? <PropertyModal title="Add Client Property" initial={emptyProperty} editorOnly={editorOnly} onClose={() => setShowCreate(false)} onSaved={(property) => { onChange([...properties, property].sort((a, b) => a.name.localeCompare(b.name))); setShowCreate(false); if (!editorOnly) setContractProperty(property) }} /> : null}
      {editing ? <PropertyModal title="Edit Client Property" initial={editing} propertyId={editing.id} editorOnly={editorOnly} onClose={() => setEditing(null)} onSaved={(property) => { onChange(properties.map((item) => item.id === property.id ? property : item).sort((a, b) => a.name.localeCompare(b.name))); setEditing(null) }} /> : null}
      {contractProperty ? <ContractPreviewModal property={contractProperty} onClose={() => setContractProperty(null)} /> : null}
      {invoiceProperty ? <RevenueInvoiceModal property={invoiceProperty} onClose={() => setInvoiceProperty(null)} /> : null}
      {credentialsProperty ? <PropertyCredentialsModal property={credentialsProperty} onClose={() => setCredentialsProperty(null)} /> : null}
    </div>
  )
}

type PropertyDetailItem = {
  label: string
  value: string
  accent?: boolean
  capitalize?: boolean
}

function PropertyDetailGroup({ title, items, children }: { title: string; items: PropertyDetailItem[]; children?: ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ghost">{title}</h3>
      <dl className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 text-sm">
            <dt className="text-sub">{item.label}</dt>
            <dd className={`${item.accent ? 'font-semibold text-[#66B159]' : 'text-ink'} ${item.capitalize ? 'capitalize' : ''} break-words`}>{item.value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  )
}

type InvoiceSettings = { accountName: string; bankName: string; accountNumber: string; ifscCode: string; upiVpa: string; upiNumber: string; companyAddress: string }
const emptyInvoiceSettings: InvoiceSettings = { accountName: '', bankName: '', accountNumber: '', ifscCode: '', upiVpa: '', upiNumber: '', companyAddress: '' }
function RevenueInvoiceModal({ property, onClose }: { property: PropertyRecord; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [invoiceDate, setInvoiceDate] = useState(todayLocalDateOnly())
  const [dueDate, setDueDate] = useState(todayLocalDateOnly())
  const [billingPeriod, setBillingPeriod] = useState('')
  const [managedRevenue, setManagedRevenue] = useState('')
  const [notes, setNotes] = useState('Revenue management services provided for the stated billing period.')
  const [template, setTemplate] = useState('')
  const [settings, setSettings] = useState<InvoiceSettings>(emptyInvoiceSettings)
  const [sequence, setSequence] = useState(0)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [year, month] = invoiceDate.split('-')
  const invoiceNumber = sequence
    ? `PP-RMS-${month}-${year.slice(-2)}-${String(sequence).padStart(3, '0')}`
    : `PP-RMS-${month}-${year.slice(-2)}-PREVIEW`
  const subtotal = Number(managedRevenue || 0) * property.commissionPercent / 100

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch('/template/ProfitPro_Revenue_Management_Invoice_Template.html', { signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error('Revenue invoice template could not be loaded.'); return response.text() }),
      apiFetch<{ settings: InvoiceSettings }>('/api/admin/invoice-settings', { signal: controller.signal }),
    ]).then(([html, payment]) => { setTemplate(html); setSettings(payment.settings || emptyInvoiceSettings) })
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Revenue invoice could not be prepared.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [property.id])

  const rendered = useMemo(() => {
    if (!template) return ''
    const values: Record<string, string | number> = {
      invoice_number: invoiceNumber, invoice_date: formatDateOnlyDisplay(invoiceDate), due_date: formatDateOnlyDisplay(dueDate),
      billing_period: billingPeriod, client_name: property.contactName || property.name, property_name: property.name,
      property_address: [property.address, property.city].filter(Boolean).join(', '), email_address: property.contactEmail,
      phone: property.contactPhone, managed_revenue: Number(managedRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      commission_percent: property.commissionPercent.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      subtotal: subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }), total_amount: subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }), notes,
      account_name: settings.accountName, bank_name: settings.bankName, account_number: settings.accountNumber,
      ifsc_code: settings.ifscCode, upi_vpa: settings.upiVpa, upi_number: settings.upiNumber, company_address: settings.companyAddress,
    }
    return Object.entries(values).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, escapeHtml(value)), template)
  }, [billingPeriod, dueDate, invoiceDate, invoiceNumber, managedRevenue, notes, property, settings, subtotal, template])

  async function downloadPdf() {
    if (!billingPeriod.trim() || managedRevenue === '' || !(Number(managedRevenue) >= 0)) { setError('Enter the billing period and managed revenue.'); return }
    if (!dueDate || dueDate < invoiceDate) { setError('Due date cannot be earlier than the invoice date.'); return }
    setDownloading(true); setError('')
    try {
      let issuedSequence = sequence
      if (!issuedSequence) {
        const numbering = await apiFetch<{ sequence: number }>(`/api/admin/properties/${encodeURIComponent(property.id)}/invoice-number`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceDate, dueDate, billingPeriod: billingPeriod.trim(), amount: subtotal }),
        })
        issuedSequence = numbering.sequence
        const frame = iframeRef.current
        const invoiceRendered = new Promise<void>((resolve) => frame?.addEventListener('load', () => resolve(), { once: true }))
        setSequence(issuedSequence)
        await Promise.race([invoiceRendered, new Promise<void>((resolve) => setTimeout(resolve, 2_000))])
      }
      const page = iframeRef.current?.contentDocument?.querySelector('.invoice-page') as HTMLElement | null
      if (!page) throw new Error('Revenue invoice preview is not ready.')
      await waitForPdfAssets(page)
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const canvas = await html2canvas(page, { scale: getPdfRenderScale(), useCORS: true, backgroundColor: '#ffffff', logging: false })
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST')
      releasePdfCanvas(canvas)
      const issuedInvoiceNumber = `PP-RMS-${month}-${year.slice(-2)}-${String(issuedSequence).padStart(3, '0')}`
      pdf.save(`${issuedInvoiceNumber}.pdf`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Failed to download revenue invoice.') } finally { setDownloading(false) }
  }

  const inputClass = 'h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-ink focus:border-[#66B159] focus:outline-none'
  return createPortal(<div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/75 px-3 py-5 backdrop-blur-sm"><div className="surface w-full max-w-6xl overflow-hidden rounded-xl shadow-2xl"><div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 p-5 sm:px-6"><div><p className="text-lg font-semibold text-ink">Generate revenue invoice</p><p className="mt-1 text-sm text-sub">{property.name} · {sequence ? invoiceNumber : 'Number assigned on download'}</p></div><div className="flex flex-wrap items-end gap-3"><label className="block w-40"><span className="label-upper mb-2 block text-ghost">Invoice date</span><DatePickerInput value={invoiceDate} onChange={setInvoiceDate} className={inputClass} required /></label><label className="block w-40"><span className="label-upper mb-2 block text-ghost">Due date</span><DatePickerInput value={dueDate} onChange={setDueDate} min={invoiceDate} className={inputClass} required /></label><label className="block w-44"><span className="label-upper mb-2 block text-ghost">Billing period</span><input value={billingPeriod} onChange={(event) => setBillingPeriod(event.target.value)} maxLength={80} className={inputClass} required /></label><label className="block w-44"><span className="label-upper mb-2 block text-ghost">Managed revenue</span><input type="number" min="0" step="0.01" value={managedRevenue} onChange={(event) => setManagedRevenue(event.target.value)} className={inputClass} required /></label><button type="button" onClick={downloadPdf} disabled={loading || downloading || Boolean(error) || !billingPeriod || managedRevenue === ''} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white disabled:opacity-60">{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF</button><button type="button" onClick={onClose} className="h-11 rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-sub">Close</button></div></div><div className="border-b border-zinc-800 p-5"><label className="block"><span className="label-upper mb-2 block text-ghost">Invoice notes</span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} className={`${inputClass} h-auto py-2.5`} /></label>{error ? <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}</div><div className="max-h-[calc(100vh-13rem)] overflow-auto bg-zinc-950/60 p-3 sm:p-6">{loading ? <div className="flex min-h-96 items-center justify-center text-sub"><Loader2 className="h-5 w-5 animate-spin" /></div> : null}{!loading && rendered ? <iframe ref={iframeRef} title={`Revenue invoice preview for ${property.name}`} srcDoc={rendered} className="mx-auto h-[1123px] w-[794px] max-w-none border-0 bg-white" /> : null}</div></div></div>, document.body)
}

function PropertyModal({ title, initial, propertyId, editorOnly = false, onClose, onSaved }: { title: string; initial: PropertyInput; propertyId?: string; editorOnly?: boolean; onClose: () => void; onSaved: (property: PropertyRecord) => void }) {
  const [form, setForm] = useState<PropertyInput>({ ...emptyProperty, ...initial })
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
        body: JSON.stringify(editorOnly ? Object.fromEntries(Object.entries(form).filter(([field]) => !['gstNumber', 'signedContractUrl', 'status'].includes(field))) : form),
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
            {!editorOnly ? <Field label="GSTIN (if applicable)"><input value={form.gstNumber} onChange={(e) => update('gstNumber', e.target.value.toUpperCase())} minLength={15} maxLength={15} className={inputClass} placeholder="22AAAAA0000A1Z5" /></Field> : null}
            <Field label="Number of rooms *"><input type="number" min="0" max="100000" step="1" value={form.roomCount} onChange={(e) => update('roomCount', Number(e.target.value))} className={inputClass} required /></Field>
            <Field label="Revenue commission % *"><input type="number" min="0" max="100" step="0.01" value={form.commissionPercent} onChange={(e) => update('commissionPercent', Number(e.target.value))} className={inputClass} required /></Field>
            <Field label="Contract start date"><DatePickerInput value={form.contractStartDate} onChange={(value) => update('contractStartDate', value)} className={inputClass} /></Field>
            {!editorOnly ? <Field label="Signed contract link"><input type="url" inputMode="url" value={form.signedContractUrl} onChange={(e) => update('signedContractUrl', e.target.value)} maxLength={2048} className={inputClass} placeholder="https://..." /><span className="mt-1 block text-xs text-sub">Required before changing the status to Active.</span></Field> : null}
            {!editorOnly ? <Field label="Status"><select value={form.status} onChange={(e) => update('status', e.target.value as PropertyInput['status'])} className={inputClass}><option value="pending">Pending</option><option value="active">Active</option><option value="inactive">Inactive</option></select></Field> : null}
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
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [template, setTemplate] = useState('')
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch('/template/ProfitPro_Revenue_Management_Contract_Template.html', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('The contract template could not be loaded.')
        return response.text()
      })
      .then((html) => { if (!controller.signal.aborted) setTemplate(html) })
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Failed to generate contract preview.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [property.id])

  const rendered = useMemo(() => {
    if (!template) return ''
    const dateValue = property.contractStartDate || property.createdAt || ''
    const date = dateValue ? new Date(dateValue.includes('T') ? dateValue : `${dateValue}T00:00:00Z`) : null
    const effectiveDate = date && !Number.isNaN(date.valueOf())
      ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
      : ''
    const values: Record<string, string | number> = {
      contract_number: property.contractNumber || 'Pending assignment',
      effective_date: effectiveDate,
      client_name: property.contactName || property.name,
      property_name: property.name,
      percentage: property.commissionPercent.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      property_address: [property.address, property.city].filter(Boolean).join(', '),
      email_address: property.contactEmail || 'N/A',
      phone: property.contactPhone || 'N/A',
      gst: property.gstNumber || 'N/A',
    }
    return Object.entries(values).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, escapeHtml(value)), template)
  }, [property, template])

  async function downloadPdf() {
    const frameDocument = iframeRef.current?.contentDocument
    const pages = frameDocument ? Array.from(frameDocument.querySelectorAll('.contract-page')) as HTMLElement[] : []
    if (!pages.length || loading || error) return
    setDownloading(true)
    setError('')
    try {
      await waitForPdfAssets(pages)
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
      for (let index = 0; index < pages.length; index += 1) {
        const canvas = await html2canvas(pages[index], { scale: getPdfRenderScale(), useCORS: true, backgroundColor: '#ffffff', logging: false })
        if (index > 0) pdf.addPage('a4', 'portrait')
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST')
        releasePdfCanvas(canvas)
      }
      const safeName = property.name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'property'
      pdf.save(`${safeName}-ProfitPro-Contract.pdf`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to download the contract PDF.')
    } finally {
      setDownloading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/75 px-3 py-5 backdrop-blur-sm sm:px-6" onClick={onClose}>
      <div className="surface w-full max-w-6xl overflow-hidden rounded-xl shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-700 px-5 py-4 sm:px-6">
          <div>
            <p className="text-lg font-semibold text-ink">Contract preview</p>
            <p className="mt-1 text-sm text-sub">{property.name} · HTML preview with fixed A4 alignment</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={downloadPdf} disabled={loading || downloading || Boolean(error)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#66B159] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#73bd66] disabled:cursor-not-allowed disabled:opacity-60">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? 'Preparing PDF…' : 'Download PDF'}
            </button>
            <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-sub hover:bg-zinc-800 hover:text-ink" aria-label="Close contract preview" title="Close preview"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {error ? <div className="m-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:m-6">{error}</div> : null}
        <div className="max-h-[calc(100vh-9rem)] overflow-auto bg-zinc-950/60 p-3 sm:p-6">
          {loading ? <div className="flex min-h-96 items-center justify-center gap-3 text-sm text-sub"><Loader2 className="h-5 w-5 animate-spin" /> Generating contract preview…</div> : null}
          {!loading && rendered ? <iframe ref={iframeRef} title={`Contract preview for ${property.name}`} srcDoc={rendered} className="mx-auto h-[3441px] w-[842px] max-w-none border-0 bg-transparent" /> : null}
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
