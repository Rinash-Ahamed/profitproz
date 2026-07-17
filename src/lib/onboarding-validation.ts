import { OTA_PLATFORMS, type OnboardingDetailsInput, type OnboardingPlatformStatus, type OtaPlatform } from '@/lib/onboarding'

const platformSet = new Set<string>(OTA_PLATFORMS)
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^[0-9]{7,15}$/

export function parseOnboardingDetails(body: unknown): { value?: OnboardingDetailsInput; error?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Invalid onboarding request.' }
  const input = body as Record<string, unknown>
  const propertyName = typeof input.propertyName === 'string' ? input.propertyName.trim() : ''
  const clientName = typeof input.clientName === 'string' ? input.clientName.trim() : ''
  const propertyAddress = typeof input.propertyAddress === 'string' ? input.propertyAddress.trim() : ''
  const emailAddress = typeof input.emailAddress === 'string' ? input.emailAddress.trim().toLowerCase() : ''
  const phone = typeof input.phone === 'string' ? input.phone.trim() : ''
  const invoiceNotes = typeof input.invoiceNotes === 'string' ? input.invoiceNotes.trim() : ''
  const ratePerPlatform = input.ratePerPlatform

  if (!propertyName || propertyName.length > 160) return { error: 'Enter a valid property name.' }
  if (!clientName || clientName.length > 120 || /\d/.test(clientName)) return { error: 'Enter a valid client name without digits.' }
  if (!propertyAddress || propertyAddress.length > 500) return { error: 'Enter a valid property address.' }
  if (!emailAddress || emailAddress.length > 254 || !emailPattern.test(emailAddress)) return { error: 'Enter a valid billing email.' }
  if (!phonePattern.test(phone)) return { error: 'Phone number must contain 7 to 15 digits.' }
  if (typeof ratePerPlatform !== 'number' || !Number.isFinite(ratePerPlatform) || ratePerPlatform < 0 || ratePerPlatform > 100_000_000) return { error: 'Enter a valid rate per platform.' }
  if (invoiceNotes.length > 1000) return { error: 'Invoice notes must be 1,000 characters or fewer.' }
  if (!Array.isArray(input.platforms)) return { error: 'Select at least one onboarding platform.' }

  const platforms = [...new Set(input.platforms)]
  if (platforms.length === 0 || platforms.length > OTA_PLATFORMS.length || platforms.some((platform) => typeof platform !== 'string' || !platformSet.has(platform))) {
    return { error: 'Select at least one valid onboarding platform.' }
  }

  return {
    value: {
      propertyName,
      clientName,
      propertyAddress,
      emailAddress,
      phone,
      ratePerPlatform,
      invoiceNotes,
      platforms: platforms as OtaPlatform[],
    },
  }
}

export function parseOnboardingProgress(body: unknown): { value?: { platform: OtaPlatform; status: OnboardingPlatformStatus; notes: string }; error?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Invalid onboarding update.' }
  const input = body as Record<string, unknown>
  const platform = typeof input.platform === 'string' ? input.platform : ''
  const status = input.status
  const notes = typeof input.notes === 'string' ? input.notes.trim() : ''

  if (!platformSet.has(platform)) return { error: 'Select a valid onboarding platform.' }
  if (status !== 'pending' && status !== 'live') return { error: 'Status must be Pending or Live.' }
  if (notes.length > 1000) return { error: 'Notes must be 1,000 characters or fewer.' }

  return { value: { platform: platform as OtaPlatform, status, notes } }
}
