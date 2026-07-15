import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { deleteProperty, getPropertyById, logAdminAction, updateProperty } from '@/lib/firestore'
import { parsePropertyPayload } from '@/lib/property-validation'

type RouteContext = { params: Promise<{ id: string }> }

async function requireAdmin() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  return user?.role === 'admin' ? user : null
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid property ID is required.' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid property update request.' }, { status: 400 })
  }
  const parsed = parsePropertyPayload(body, true)
  if (!parsed.value || parsed.error) return NextResponse.json({ message: parsed.error || 'Invalid property update request.' }, { status: 400 })

  try {
    const before = await getPropertyById(id)
    if (!before) return NextResponse.json({ message: 'Property was not found.' }, { status: 404 })
    const nextStatus = parsed.value.status ?? before.status
    const nextSignedContractUrl = parsed.value.signedContractUrl ?? before.signedContractUrl
    if (nextStatus === 'active' && !nextSignedContractUrl) {
      return NextResponse.json({ message: 'Add a signed contract link before setting the property to Active.' }, { status: 400 })
    }
    const property = await updateProperty(id, parsed.value)
    await logAdminAction({
      actorEmail: user.email,
      action: 'PROPERTY_UPDATE',
      targetId: id,
      details: `Admin updated client property: ${property.name}.`,
      changes: Object.fromEntries(Object.entries(parsed.value).map(([field, value]) => [field, { from: before[field as keyof typeof before], to: value }])),
    })
    return NextResponse.json({ property })
  } catch (error) {
    console.error(`Failed to update property ${id}:`, error)
    return NextResponse.json({ message: 'Failed to update client property.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })
  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid property ID is required.' }, { status: 400 })

  try {
    const property = await getPropertyById(id)
    if (!property) return NextResponse.json({ message: 'Property was not found.' }, { status: 404 })
    await deleteProperty(id)
    await logAdminAction({ actorEmail: user.email, action: 'PROPERTY_DELETE', targetId: id, details: `Admin deleted client property: ${property.name}.` })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(`Failed to delete property ${id}:`, error)
    return NextResponse.json({ message: 'Failed to delete client property.' }, { status: 500 })
  }
}
