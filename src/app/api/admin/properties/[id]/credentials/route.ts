import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import { parseClientCredentials, type ClientPlatformCredential } from '@/lib/client-credentials'
import { decryptCredentialPayload, encryptCredentialPayload } from '@/lib/credential-encryption'
import { getEncryptedPropertyCredentials, getPropertyById, logAdminAction, saveEncryptedPropertyCredentials } from '@/lib/firestore'

type RouteContext = { params: Promise<{ id: string }> }

function configurationError(error: unknown) {
  return error instanceof Error && error.message === 'CLIENT_CREDENTIALS_ENCRYPTION_KEY_NOT_CONFIGURED'
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid property ID is required.' }, { status: 400 })

  try {
    if (!await getPropertyById(id)) return NextResponse.json({ message: 'Property was not found.' }, { status: 404 })
    const payload = await getEncryptedPropertyCredentials(id)
    const credentials = payload ? decryptCredentialPayload<ClientPlatformCredential[]>(payload) : []
    return NextResponse.json({ credentials }, { headers: { 'Cache-Control': 'no-store, private' } })
  } catch (error) {
    if (configurationError(error)) return NextResponse.json({ message: 'Client credential encryption is not configured.' }, { status: 503 })
    console.error(`Failed to load encrypted credentials for property ${id}:`, error)
    return NextResponse.json({ message: 'Failed to load platform credentials.' }, { status: 500 })
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const user = await requireAdminSession()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid property ID is required.' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid credential request.' }, { status: 400 })
  }
  const values = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>).credentials : undefined
  const parsed = parseClientCredentials(values)
  if (!parsed.credentials || parsed.error) return NextResponse.json({ message: parsed.error || 'Invalid platform credentials.' }, { status: 400 })

  try {
    const property = await getPropertyById(id)
    if (!property) return NextResponse.json({ message: 'Property was not found.' }, { status: 404 })
    await saveEncryptedPropertyCredentials(id, encryptCredentialPayload(parsed.credentials))
    await logAdminAction({
      actorEmail: user.email,
      action: 'PROPERTY_CREDENTIALS_UPDATE',
      targetId: id,
      details: `Admin updated ${parsed.credentials.length} encrypted platform credential${parsed.credentials.length === 1 ? '' : 's'} for ${property.name}.`,
    })
    return NextResponse.json({ credentials: parsed.credentials }, { headers: { 'Cache-Control': 'no-store, private' } })
  } catch (error) {
    if (configurationError(error)) return NextResponse.json({ message: 'Client credential encryption is not configured.' }, { status: 503 })
    console.error(`Failed to save encrypted credentials for property ${id}:`, error)
    return NextResponse.json({ message: 'Failed to save platform credentials.' }, { status: 500 })
  }
}
