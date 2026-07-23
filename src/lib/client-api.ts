'use client'

export class ApiClientError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message)
    this.name = 'ApiClientError'
  }
}

type ErrorPayload = { message?: string; code?: string }
const inFlightGetRequests = new Map<string, Promise<Response>>()

async function readPayload<T>(response: Response): Promise<T & ErrorPayload> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return {} as T & ErrorPayload
  return response.json().catch(() => ({})) as Promise<T & ErrorPayload>
}

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
  const canCoalesce = method === 'GET' && !init?.signal
  const key = canCoalesce
    ? `${typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url}`
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
  if (response.status === 401 || response.status === 403) {
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
