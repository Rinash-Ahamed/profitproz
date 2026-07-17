export const OTA_PLATFORMS = [
  'Agoda',
  'Airbnb',
  'Booking.com',
  'Cleartrip',
  'Expedia',
  'Goibibo',
  'MakeMyTrip',
  'Trip.com',
  'Tripadvisor',
  'Trivago',
] as const

export type OtaPlatform = (typeof OTA_PLATFORMS)[number]
export type OnboardingPlatformStatus = 'pending' | 'live'

export type OnboardingPlatformProgress = {
  platform: OtaPlatform
  status: OnboardingPlatformStatus
  notes: string
}

export type OnboardingRecord = {
  id: string
  propertyName: string
  clientName: string
  propertyAddress: string
  emailAddress: string
  phone: string
  ratePerPlatform: number
  invoiceNotes: string
  platforms: OnboardingPlatformProgress[]
  createdAt?: string
  updatedAt?: string
}

export type OnboardingDetailsInput = Omit<OnboardingRecord, 'id' | 'platforms' | 'createdAt' | 'updatedAt'> & {
  platforms: OtaPlatform[]
}
