import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import 'server-only'
import type { PropertyRecord } from '@/lib/firestore'

const CONTRACT_TEMPLATE = 'ProfitPro_Policy_Template_Web_V1.docx'

function formatContractDate(value?: string) {
  const date = value ? new Date(value.includes('T') ? value : `${value}T00:00:00Z`) : new Date()
  return Number.isNaN(date.valueOf())
    ? ''
    : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

function createContractNumber(property: PropertyRecord) {
  const sourceDate = property.contractStartDate || property.createdAt
  const date = sourceDate ? new Date(sourceDate.includes('T') ? sourceDate : `${sourceDate}T00:00:00Z`) : new Date()
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = String(date.getUTCFullYear()).slice(-2)
  const randomFourDigits = 1000 + (createHash('sha256').update(property.id).digest().readUInt32BE(0) % 9000)
  return `${day}_${month}_${year}_${randomFourDigits}`
}

export function getContractFilename(property: PropertyRecord) {
  const safeName = property.name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'property'
  return `${safeName}-ProfitPro-Contract.docx`
}

export function renderPropertyContract(property: PropertyRecord) {
  const templatePath = path.join(process.cwd(), 'public', 'template', CONTRACT_TEMPLATE)
  const zip = new PizZip(fs.readFileSync(templatePath))
  const document = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  })

  document.render({
    client_name: property.contactName || property.name,
    contract_uuid: createContractNumber(property),
    effective_date: formatContractDate(property.contractStartDate || property.createdAt),
    email_address: property.contactEmail || 'N/A',
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
