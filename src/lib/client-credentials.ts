import { OTA_PLATFORMS } from './onboarding'

export type ClientPlatformCredential = {
  id: string
  platform: string
  username: string
  password: string
  notes: string
}

export function parseClientCredentials(input: unknown): { credentials?: ClientPlatformCredential[]; error?: string } {
  if (!Array.isArray(input)) return { error: 'Credentials must be provided as a list.' }
  if (input.length > OTA_PLATFORMS.length) return { error: `A maximum of ${OTA_PLATFORMS.length} platform credentials can be stored per client.` }

  const credentials: ClientPlatformCredential[] = []
  const ids = new Set<string>()
  const platforms = new Set<string>()
  const allowedPlatforms = new Set<string>(OTA_PLATFORMS)

  for (const item of input) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { error: 'Invalid platform credential.' }
    const value = item as Record<string, unknown>
    const id = typeof value.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(value.id) ? value.id : crypto.randomUUID()
    const platform = typeof value.platform === 'string' ? value.platform.trim() : ''
    const username = typeof value.username === 'string' ? value.username.trim() : ''
    const password = typeof value.password === 'string' ? value.password : ''
    const notes = typeof value.notes === 'string' ? value.notes.trim() : ''

    if (!allowedPlatforms.has(platform)) return { error: 'Select a valid OTA platform.' }
    if (platforms.has(platform)) return { error: `${platform} has already been added for this client.` }
    if (!username || username.length > 254) return { error: `Enter a valid username for ${platform}.` }
    if (password.length > 500) return { error: `Password for ${platform} cannot exceed 500 characters.` }
    if (notes.length > 500) return { error: `Notes for ${platform} cannot exceed 500 characters.` }
    if (ids.has(id)) return { error: 'Duplicate credential entry detected.' }

    ids.add(id)
    platforms.add(platform)
    credentials.push({ id, platform, username, password, notes })
  }

  return { credentials }
}
