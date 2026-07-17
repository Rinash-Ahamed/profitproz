import fs from 'node:fs'
import path from 'node:path'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import 'server-only'
import type { PropertyRecord } from '@/lib/firestore'

function getContractTemplatePath() {
  const templateDirectory = path.join(process.cwd(), 'public', 'template')
  const templates = fs.readdirSync(templateDirectory).filter((filename) =>
    filename.toLowerCase().endsWith('.docx') && !filename.startsWith('~$')
  )

  if (templates.length !== 1) {
    throw new Error(`Expected exactly one DOCX contract template in public/template, found ${templates.length}.`)
  }

  return path.join(templateDirectory, templates[0])
}

function formatContractDate(value?: string) {
  const date = value ? new Date(value.includes('T') ? value : `${value}T00:00:00Z`) : new Date()
  return Number.isNaN(date.valueOf())
    ? ''
    : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

export function getContractFilename(property: PropertyRecord) {
  const safeName = property.name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'property'
  return `${safeName}-ProfitPro-Contract.docx`
}

export function renderPropertyContract(property: PropertyRecord) {
  if (!property.contractNumber) throw new Error('Property contract number has not been assigned.')
  const zip = new PizZip(fs.readFileSync(getContractTemplatePath()))
  const document = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  })

  document.render({
    client_name: property.contactName || property.name,
    contract_uuid: property.contractNumber.replace(/^PP-RMS-/, ''),
    effective_date: formatContractDate(property.contractStartDate || property.createdAt),
    email_address: property.contactEmail || 'N/A',
    phone: property.contactPhone || '',
    gst: property.gstNumber || '',
    percentage: property.commissionPercent.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
    property_address: [property.address, property.city].filter(Boolean).join(', '),
    property_name: property.name,
  })

  return document.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}
