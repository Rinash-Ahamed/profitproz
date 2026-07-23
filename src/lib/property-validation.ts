import type { PropertyInput } from '@/lib/firestore'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+?[0-9 ()-]{7,20}$/
const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/

type PropertyPayload = Record<string, unknown>

export function parsePropertyPayload(body: unknown, partial = false): { value?: Partial<PropertyInput>; error?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Invalid property request.' }
  const input = body as PropertyPayload
  const value: Partial<PropertyInput> = {}
  const has = (field: keyof PropertyInput) => Object.prototype.hasOwnProperty.call(input, field)
  const readText = (field: keyof PropertyInput, max: number, required = false) => {
    if (!has(field)) {
      if (!partial && required) return `${field} is required.`
      return
    }
    if (typeof input[field] !== 'string') return `${field} must be text.`
    const text = input[field].trim()
    if (required && !text) return `${field} is required.`
    if (text.length > max) return `${field} is too long.`
    ;(value as Record<string, unknown>)[field] = text
  }

  let error = readText('name', 160, true)
  error ||= readText('contactName', 100)
  error ||= readText('contactEmail', 254)
  error ||= readText('contactPhone', 20)
  error ||= readText('gstNumber', 15)
  error ||= readText('city', 100, true)
  error ||= readText('address', 500)
  error ||= readText('contractStartDate', 10)
  error ||= readText('signedContractUrl', 2048)
  error ||= readText('notes', 2000)
  if (error) return { error }

  if (value.contactEmail && !emailPattern.test(value.contactEmail)) return { error: 'Enter a valid contact email.' }
  if (value.contactPhone && !phonePattern.test(value.contactPhone)) return { error: 'Enter a valid contact phone number.' }
  if (value.gstNumber) {
    value.gstNumber = value.gstNumber.toUpperCase()
    if (!gstPattern.test(value.gstNumber)) return { error: 'Enter a valid 15-character GSTIN.' }
  }
  if (value.contractStartDate) {
    const parsed = new Date(`${value.contractStartDate}T00:00:00Z`)
    if (!datePattern.test(value.contractStartDate) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value.contractStartDate) {
      return { error: 'Enter a valid contract start date.' }
    }
  }

  if (value.signedContractUrl) {
    try {
      if (new URL(value.signedContractUrl).protocol !== 'https:') return { error: 'Signed contract link must use HTTPS.' }
    } catch {
      return { error: 'Enter a valid signed contract link.' }
    }
  }

  if (has('propertyType')) {
    if (!['hotel', 'resort', 'homestay', 'serviced-apartment', 'hostel', 'other'].includes(input.propertyType as string)) {
      return { error: 'Select a valid property type.' }
    }
    value.propertyType = input.propertyType as PropertyInput['propertyType']
  } else if (!partial) {
    return { error: 'Property type is required.' }
  }

  for (const [field, maximum, integer] of [['roomCount', 100_000, true], ['commissionPercent', 100, false]] as const) {
    if (!has(field)) {
      if (!partial) return { error: `${field} is required.` }
      continue
    }
    const number = typeof input[field] === 'number' ? input[field] : Number.NaN
    if (!Number.isFinite(number) || number < 0 || number > maximum || (integer && !Number.isInteger(number))) {
      return { error: field === 'roomCount' ? 'Room count must be a whole number between 0 and 100,000.' : 'Commission must be between 0 and 100 percent.' }
    }
    value[field] = number
  }

  if (has('status')) {
    if (input.status !== 'pending' && input.status !== 'active' && input.status !== 'inactive') return { error: 'Status must be pending, active, or inactive.' }
    value.status = input.status
  } else if (!partial) {
    value.status = 'pending'
  }

  if (partial && Object.keys(value).length === 0) return { error: 'No valid property fields were provided.' }
  return { value }
}
