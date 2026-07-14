import { NextRequest, NextResponse } from 'next/server'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const MAX_API_BODY_BYTES = 32 * 1024

export function proxy(request: NextRequest) {
  if (!MUTATING_METHODS.has(request.method)) return NextResponse.next()

  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')
  const contentLength = Number(request.headers.get('content-length') || 0)

  if ((origin && origin !== request.nextUrl.origin) || fetchSite === 'cross-site') {
    return NextResponse.json({ message: 'Cross-site request rejected.' }, { status: 403 })
  }

  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > MAX_API_BODY_BYTES) {
    return NextResponse.json({ message: 'Request body is too large.' }, { status: 413 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
