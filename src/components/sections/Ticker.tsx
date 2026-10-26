'use client'
/* eslint-disable @next/next/no-img-element -- OTA logos intentionally use intrinsic img sizing in the continuous ticker. */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useVisibleActivity } from '@/hooks/useVisibleActivity'
import type { OtaLogo } from '@/lib/getOtaLogos'

type TickerProps = {
  logos: OtaLogo[]
  duration?: number
}

const tickerKeyframes = `
  @keyframes ticker {
    from { transform: translate3d(0, 0, 0); }
    to { transform: translate3d(-50%, 0, 0); }
  }

  @keyframes mobile-logo-rotate {
    from {
      opacity: 0;
      transform: translate3d(0, 8px, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
`

const TickerComponent = ({ logos, duration = 30 }: TickerProps) => {
  const duplicatedLogos = [...logos, ...logos]
  const [mobileSet, setMobileSet] = useState(0)
  const reduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const active = useVisibleActivity(containerRef)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const mobileLogos = useMemo(() => {
    if (logos.length <= 6) return logos

    return Array.from({ length: 6 }, (_, index) => logos[(mobileSet * 3 + index) % logos.length])
  }, [logos, mobileSet])

  useEffect(() => {
    if (logos.length <= 6 || reduceMotion || !mobile || !active) return

    const id = window.setInterval(() => {
      setMobileSet((current) => (current + 1) % Math.ceil(logos.length / 3))
    }, 2400)

    return () => window.clearInterval(id)
  }, [logos.length, reduceMotion, mobile, active])

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden [transform:translateZ(0)]">
      <style>{tickerKeyframes}</style>

      <div
        key={mobileSet}
        className="mx-auto grid max-w-sm grid-cols-3 items-center justify-items-center gap-x-6 gap-y-5 px-6 md:hidden"
        style={{
          animation: reduceMotion ? 'none' : 'mobile-logo-rotate 420ms ease-out both',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {mobileLogos.map((logo, i) => (
          <img
            key={`${logo.src}-${i}`}
            src={logo.src}
            srcSet={logo.srcSet}
            sizes={logo.width && logo.height ? `${Math.min(96, Math.ceil(28 * logo.width / logo.height))}px` : undefined}
            width={logo.width}
            height={logo.height}
            alt={logo.alt}
            loading="lazy"
            decoding="async"
            className="h-7 w-auto max-w-[96px] object-contain [content-visibility:visible]"
          />
        ))}
      </div>

      <div className="pointer-events-none absolute left-0 top-0 z-10 hidden h-full w-1/5 bg-gradient-to-r from-zinc-1000 to-transparent md:block" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 hidden h-full w-1/5 bg-gradient-to-l from-zinc-1000 to-transparent md:block" />
      <div
        className="ota-ticker-track hidden w-max flex-nowrap items-center md:flex"
        style={{
          animation: reduceMotion ? 'none' : `ticker ${duration}s linear infinite`,
          animationPlayState: active ? 'running' : 'paused',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transformOrigin: 'left center',
        } as React.CSSProperties}
      >
        {duplicatedLogos.map((logo, i) => (
          <div key={`${logo.src}-${i}`} className="flex h-7 shrink-0 items-center px-5 md:h-8 md:px-8">
            <img
              src={logo.src}
              srcSet={logo.srcSet}
              sizes={logo.width && logo.height ? `${Math.ceil(32 * logo.width / logo.height)}px` : undefined}
              width={logo.width}
              height={logo.height}
              alt={i >= logos.length ? '' : logo.alt}
              aria-hidden={i >= logos.length}
              loading="eager"
              decoding="async"
              className="h-full w-auto max-w-none object-contain [content-visibility:visible]"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export const Ticker = React.memo(TickerComponent)
