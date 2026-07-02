'use client'
import React from 'react'

type TickerProps = {
  logos: { src: string; alt: string }[]
  duration?: number
}

const tickerKeyframes = `
  @keyframes ticker {
    from { transform: translate3d(0, 0, 0); }
    to { transform: translate3d(-50%, 0, 0); }
  }

  @media (max-width: 767px) {
    .ota-ticker-track {
      animation-duration: var(--ticker-mobile-duration) !important;
    }
  }
`

const TickerComponent = ({ logos, duration = 30 }: TickerProps) => {
  const duplicatedLogos = [...logos, ...logos]
  const mobileDuration = Math.max(duration + 16, 52)

  return (
    <div className="relative w-full overflow-hidden [transform:translateZ(0)]">
      <div className="mx-auto grid max-w-sm grid-cols-3 items-center justify-items-center gap-x-6 gap-y-5 px-6 md:hidden">
        {logos.map((logo) => (
          <img
            key={logo.src}
            src={logo.src}
            alt={logo.alt}
            loading="eager"
            decoding="async"
            className="h-7 w-auto max-w-[96px] object-contain [content-visibility:visible]"
          />
        ))}
      </div>

      <div className="pointer-events-none absolute left-0 top-0 z-10 hidden h-full w-1/5 bg-gradient-to-r from-zinc-1000 to-transparent md:block" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 hidden h-full w-1/5 bg-gradient-to-l from-zinc-1000 to-transparent md:block" />
      <style>{tickerKeyframes}</style>
      <div
        className="ota-ticker-track hidden w-max flex-nowrap items-center md:flex"
        style={{
          animation: `ticker ${duration}s linear infinite`,
          '--ticker-mobile-duration': `${mobileDuration}s`,
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transformOrigin: 'left center',
        } as React.CSSProperties & { '--ticker-mobile-duration': string }}
      >
        {duplicatedLogos.map((logo, i) => (
          <div key={`${logo.src}-${i}`} className="flex h-7 shrink-0 items-center px-5 md:h-8 md:px-8">
            <img
              src={logo.src}
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
