'use client'

import { useEffect, useState, type RefObject } from 'react'

/** Run continuous work only while its surface and browser tab are visible. */
export function useVisibleActivity<T extends Element>(ref: RefObject<T | null>) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    let visible = false
    const update = () => setActive(visible && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      update()
    })
    observer.observe(element)
    document.addEventListener('visibilitychange', update)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [ref])
  return active
}
