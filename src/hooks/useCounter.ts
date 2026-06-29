'use client'
import { useEffect, useRef, useState } from 'react'

export function useCounter(end: number, duration = 2, active = true) {
  const [val, setVal] = useState(0)
  const raf = useRef<number>()
  const start = useRef<number>()

  useEffect(() => {
    if (!active) return
    const ease = (t: number) => 1 - Math.pow(1 - t, 4) // easeOutQuart

    const tick = (now: number) => {
      if (!start.current) start.current = now
      const p = Math.min((now - start.current) / (duration * 1000), 1)
      setVal(Math.round(ease(p) * end))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }

    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [end, duration, active])

  return val
}
