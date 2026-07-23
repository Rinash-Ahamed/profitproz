import { NextResponse } from 'next/server'
import 'server-only'

export async function timedApiResponse(
  label: string,
  operation: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const startedAt = performance.now()
  try {
    return await operation()
  } finally {
    const duration = Math.round(performance.now() - startedAt)
    if (duration >= 750) console.warn(`[slow-api] ${label} completed in ${duration}ms`)
  }
}
