'use client'
import { useEffect, useRef, useState } from 'react'

export function useCounter(end: number, duration = 2, active = true) {
  const [val, setVal] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      // If inactive, ensure the state is reset to 0 for the next time it becomes active.
      setVal(0)
      return
    }

    // Animation logic runs only when active.
    let startTimestamp: number | null = null
    const ease = (t: number) => 1 - Math.pow(1 - t, 4)

    const step = (timestamp: number) => {
      if (startTimestamp === null) {
        startTimestamp = timestamp
      }

      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1)
      setVal(Math.round(ease(progress) * end))

      if (progress < 1) {
        raf.current = requestAnimationFrame(step)
      }
    }

    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current)
    }
  }, [end, duration, active])

  // Return 0 immediately if not active to prevent showing a stale value on the way out.
  return active ? val : 0
}
