'use client'

import { useEffect, useState } from 'react'
import { cachedTabFetch } from '@/lib/client-api'

export function useFinancePage<T>(query: string, refresh: number, onError: (message: string) => void) {
  const key = `${query}:${refresh}`
  const [navigation, setNavigation] = useState({ key, cursors: [''], index: 0 })
  const current = navigation.key === key ? navigation : { key, cursors: [''], index: 0 }
  const cursor = current.cursors[current.index]
  const requestKey = `${key}:${cursor}`
  const [result, setResult] = useState<{ key: string; items: T[]; nextCursor: string | null }>({ key: '', items: [], nextCursor: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => { setNavigation({ key, cursors: [''], index: 0 }) }, [key])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const response = await cachedTabFetch(`/api/admin/finance?${query}&cursor=${encodeURIComponent(cursor)}`, { signal: controller.signal })
        const data = await response.json()
        if (!response.ok || !Array.isArray(data.items)) throw new Error(data.message || 'Failed to load Finance records.')
        if (!controller.signal.aborted) setResult({ key: requestKey, items: data.items, nextCursor: data.nextCursor })
      } catch (error) {
        if (!controller.signal.aborted) onError(error instanceof Error ? error.message : 'Failed to load Finance records.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, query.includes('search=') ? 250 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, cursor, requestKey, onError])

  return {
    items: result.key === requestKey ? result.items : [],
    loading,
    page: current.index + 1,
    hasMore: result.key === requestKey && !!result.nextCursor,
    previous: () => setNavigation({ ...current, index: Math.max(0, current.index - 1) }),
    next: () => {
      if (result.key === requestKey && result.nextCursor) setNavigation({ key, cursors: [...current.cursors.slice(0, current.index + 1), result.nextCursor], index: current.index + 1 })
    },
  }
}
