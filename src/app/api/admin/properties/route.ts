import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { createProperty, listProperties, logAdminAction, type PropertyInput } from '@/lib/firestore'
import { parsePropertyPayload } from '@/lib/property-validation'

async function requireAdmin() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  return user?.role === 'admin' ? user : null
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  try {
    const properties = await listProperties()
    properties.sort((a, b) => a.name.localeCompare(b.name))
    return NextResponse.json({ properties })
  } catch (error) {
    console.error('Failed to list properties:', error)
    return NextResponse.json({ message: 'Failed to load client properties.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid property request.' }, { status: 400 })
  }

  const parsed = parsePropertyPayload(body)
  if (!parsed.value || parsed.error) return NextResponse.json({ message: parsed.error || 'Invalid property request.' }, { status: 400 })
  if (parsed.value.status === 'active' && !parsed.value.signedContractUrl) {
    return NextResponse.json({ message: 'Add a signed contract link before setting the property to Active.' }, { status: 400 })
  }

  try {
    const property = await createProperty(parsed.value as PropertyInput)
    await logAdminAction({
      actorEmail: user.email,
      action: 'PROPERTY_CREATE',
      targetId: property.id,
      details: `Admin created client property: ${property.name}.`,
    })
    return NextResponse.json({ property }, { status: 201 })
  } catch (error) {
    console.error('Failed to create property:', error)
    return NextResponse.json({ message: 'Failed to create client property.' }, { status: 500 })
  }
}
