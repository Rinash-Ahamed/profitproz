'use client'

export class ApiClientError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message)
    this.name = 'ApiClientError'
  }
}

type ErrorPayload = { message?: string; code?: string }
const inFlightGetRequests = new Map<string, Promise<Response>>()
const tabResponses = new Map<string, { expiresAt: number; response: Response }>()
let cacheGeneration = 0

export function clearTabCache() {
  cacheGeneration += 1
  tabResponses.clear()
  inFlightGetRequests.clear()
}

// Memory only: no employee or finance data is persisted to browser storage.
export async function cachedTabFetch(url: string, init?: RequestInit) {
  if ((init?.method || 'GET').toUpperCase() !== 'GET' || !/^\/api\/(?:admin\/(?:staff|properties|onboardings|expenses|leaves|finance)|staff\/(?:expenses|leaves)|properties|onboardings)(?:\?|$)/.test(url)) return authenticatedFetch(url, init)
  init?.signal?.throwIfAborted()
  const cached = tabResponses.get(url)
  if (init?.cache !== 'no-store' && cached && cached.expiresAt > Date.now()) return cached.response.clone()
  const generation = cacheGeneration
  const response = await authenticatedFetch(url, { ...init, cache: 'no-store' })
  init?.signal?.throwIfAborted()
  if (response.ok && generation === cacheGeneration) {
    if (tabResponses.size >= 40) tabResponses.delete(tabResponses.keys().next().value!)
    tabResponses.set(url, { expiresAt: Date.now() + 30_000, response: response.clone() })
  }
  return response
}

async function readPayload<T>(response: Response): Promise<T & ErrorPayload> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return {} as T & ErrorPayload
  return response.json().catch(() => ({})) as Promise<T & ErrorPayload>
}

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
  if (method !== 'GET') clearTabCache()
  const canCoalesce = method === 'GET' && !init?.signal
  const key = canCoalesce
    ? `${cacheGeneration}:${typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url}`
    : ''

  let request = key ? inFlightGetRequests.get(key) : undefined
  if (!request) {
    request = globalThis.fetch(input, { credentials: 'same-origin', ...init })
    if (key) {
      inFlightGetRequests.set(key, request)
      void request.then(
        () => inFlightGetRequests.delete(key),
        () => inFlightGetRequests.delete(key),
      )
    }
  }

  // Each consumer receives its own response body even when the network request
  // was coalesced with another simultaneous GET.
  const response = (await request).clone()
  if (method !== 'GET') clearTabCache()
  if (response.status === 401 || response.status === 403) {
    clearTabCache()
    const payload = await readPayload<ErrorPayload>(response.clone())
    const sessionRejected = response.status === 401 || /access is required|authentication is required|forbidden/i.test(payload.message || '')
    if (sessionRejected && typeof window !== 'undefined') window.location.replace('/login?reason=session-expired')
  }
  return response
}

export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(input, init)
  const payload = await readPayload<T>(response)

  if (!response.ok) {
    const message = payload.message || `Request failed with status ${response.status}.`
    const sessionRejected = response.status === 401 || (response.status === 403 && /access is required|authentication is required|forbidden/i.test(message))
    if (sessionRejected && typeof window !== 'undefined') {
      window.location.replace('/login?reason=session-expired')
    }
    throw new ApiClientError(message, response.status, payload.code)
  }

  return payload
}
