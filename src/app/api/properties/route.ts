import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { listProperties, listPropertiesPage } from '@/lib/firestore'
import { readPagination } from '@/lib/pagination'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value)
  if (!user) return NextResponse.json({ message: 'Authentication is required.' }, { status: 401 })

  try {
    const pagination = readPagination(request)
    const page = pagination ? await listPropertiesPage(pagination) : null
    const properties = page?.items || await listProperties()
    properties.sort((a, b) => a.name.localeCompare(b.name))

    if (user.role === 'admin') return NextResponse.json({ properties, ...(page ? { nextCursor: page.nextCursor } : {}) })

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

    return NextResponse.json({ properties: staffProperties, ...(page ? { nextCursor: page.nextCursor } : {}) })
  } catch (error) {
    console.error('Failed to list properties:', error)
    return NextResponse.json({ message: 'Failed to load client properties.' }, { status: 500 })
  }
}
