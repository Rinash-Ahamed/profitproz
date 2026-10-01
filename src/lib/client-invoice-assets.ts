'use client'

import { authenticatedFetch } from './client-api'

export type ClientInvoiceSettings = {
  accountName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  upiVpa: string
  upiNumber: string
  companyAddress: string
}

const templatePromises = new Map<string, Promise<string>>()
let settingsPromise: Promise<ClientInvoiceSettings> | null = null

export function loadInvoiceTemplate(url: string) {
  const existing = templatePromises.get(url)
  if (existing) return existing
  const request = globalThis.fetch(url)
    .then(async (response) => {
      if (!response.ok) throw new Error('Invoice template could not be loaded.')
      return response.text()
    })
    .catch((error) => {
      templatePromises.delete(url)
      throw error
    })
  templatePromises.set(url, request)
  return request
}

export function loadInvoiceSettings() {
  if (settingsPromise) return settingsPromise
  settingsPromise = authenticatedFetch('/api/admin/invoice-settings')
    .then(async (response) => {
      const data = await response.json() as { settings?: ClientInvoiceSettings; message?: string }
      if (!response.ok || !data.settings) throw new Error(data.message || 'Invoice payment details could not be loaded.')
      return data.settings
    })
    .catch((error) => {
      settingsPromise = null
      throw error
    })
  return settingsPromise
}
