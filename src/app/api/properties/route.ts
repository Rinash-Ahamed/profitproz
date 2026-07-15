import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { listProperties } from '@/lib/firestore'

export async function GET() {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value)
  if (!user) return NextResponse.json({ message: 'Authentication is required.' }, { status: 401 })

  try {
    const properties = await listProperties()
    properties.sort((a, b) => a.name.localeCompare(b.name))

    if (user.role === 'admin') return NextResponse.json({ properties })

    const staffProperties = properties.map((property) => ({
      id: property.id,
      name: property.name,
      propertyType: property.propertyType,
      contactName: property.contactName,
      contactEmail: property.contactEmail,
      contactPhone: property.contactPhone,
      city: property.city,
      address: property.address,
      roomCount: property.roomCount,
      commissionPercent: property.commissionPercent,
      contractStartDate: property.contractStartDate,
      status: property.status,
      notes: property.notes,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    }))

    return NextResponse.json({ properties: staffProperties })
  } catch (error) {
    console.error('Failed to list properties:', error)
    return NextResponse.json({ message: 'Failed to load client properties.' }, { status: 500 })
  }
}
