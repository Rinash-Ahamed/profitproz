'use client'

export class ApiClientError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message)
    this.name = 'ApiClientError'
  }
}

type ErrorPayload = { message?: string; code?: string }

async function readPayload<T>(response: Response): Promise<T & ErrorPayload> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return {} as T & ErrorPayload
  return response.json().catch(() => ({})) as Promise<T & ErrorPayload>
}

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await globalThis.fetch(input, { credentials: 'same-origin', ...init })
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
