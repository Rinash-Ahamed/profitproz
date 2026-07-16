import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authConfig, verifyActiveSessionToken } from '@/lib/auth'
import { getContractFilename, renderPropertyContract } from '@/lib/contract-template'
import { getPropertyById, logAdminAction } from '@/lib/firestore'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const cookieStore = await cookies()
  const user = await verifyActiveSessionToken(cookieStore.get(authConfig.cookieName)?.value, { role: 'admin' })
  if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Admin access is required.' }, { status: 403 })

  const { id } = await context.params
  if (!id || id.length > 128) return NextResponse.json({ message: 'A valid property ID is required.' }, { status: 400 })

  try {
    const property = await getPropertyById(id)
    if (!property) return NextResponse.json({ message: 'Property was not found.' }, { status: 404 })

    const filename = getContractFilename(property)
    const contract = renderPropertyContract(property)

    await logAdminAction({
      actorEmail: user.email,
      action: 'CONTRACT_GENERATE',
      targetId: property.id,
      details: `Admin generated a contract for ${property.name}.`,
    })

    return new NextResponse(new Uint8Array(contract), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error(`Failed to generate contract for property ${id}:`, error)
    return NextResponse.json({ message: 'Failed to generate the property contract.' }, { status: 500 })
  }
}
