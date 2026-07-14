'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

type TickerProps = {
  logos: { src: string; alt: string }[]
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

  const mobileLogos = useMemo(() => {
    if (logos.length <= 6) return logos

    return Array.from({ length: 6 }, (_, index) => logos[(mobileSet * 3 + index) % logos.length])
  }, [logos, mobileSet])

  useEffect(() => {
    if (logos.length <= 6) return

    const id = window.setInterval(() => {
      setMobileSet((current) => (current + 1) % Math.ceil(logos.length / 3))
    }, 2400)

    return () => window.clearInterval(id)
  }, [logos.length])

  return (
    <div className="relative w-full overflow-hidden [transform:translateZ(0)]">
      <style>{tickerKeyframes}</style>

      <div
        key={mobileSet}
        className="mx-auto grid max-w-sm grid-cols-3 items-center justify-items-center gap-x-6 gap-y-5 px-6 md:hidden"
        style={{
          animation: 'mobile-logo-rotate 420ms ease-out both',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {mobileLogos.map((logo, i) => (
          <Image
            key={`${logo.src}-${i}`}
            src={logo.src}
            alt={logo.alt}
            width={96}
            height={28}
            className="h-7 w-auto max-w-[96px] object-contain [content-visibility:visible]"
          />
        ))}
      </div>

      <div className="pointer-events-none absolute left-0 top-0 z-10 hidden h-full w-1/5 bg-gradient-to-r from-zinc-1000 to-transparent md:block" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 hidden h-full w-1/5 bg-gradient-to-l from-zinc-1000 to-transparent md:block" />
      <div
        className="ota-ticker-track hidden w-max flex-nowrap items-center md:flex"
        style={{
          animation: `ticker ${duration}s linear infinite`,
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transformOrigin: 'left center',
        } as React.CSSProperties}
      >
        {duplicatedLogos.map((logo, i) => (
          <div key={`${logo.src}-${i}`} className="flex h-7 shrink-0 items-center px-5 md:h-8 md:px-8">
            <Image
              src={logo.src}
              alt={i >= logos.length ? '' : logo.alt}
              aria-hidden={i >= logos.length}
              width={120}
              height={32}
              className="h-full w-auto max-w-none object-contain [content-visibility:visible]"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export const Ticker = React.memo(TickerComponent)
