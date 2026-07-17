export type PaginationRequest = { limit: number; cursor?: string }

export function readPagination(request: Request): PaginationRequest | null {
  const url = new URL(request.url)
  if (!url.searchParams.has('limit') && !url.searchParams.has('cursor')) return null
  const requested = Number(url.searchParams.get('limit') || 50)
  const limit = Number.isInteger(requested) ? Math.min(100, Math.max(1, requested)) : 50
  const cursor = url.searchParams.get('cursor')?.trim() || undefined
  return { limit, cursor }
}
