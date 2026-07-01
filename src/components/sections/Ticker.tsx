'use client'
import Image from 'next/image'
import React from 'react'

type TickerProps = {
  logos: { src: string; alt: string }[]
  duration?: number
}

const tickerKeyframes = `
  @keyframes ticker {
    0% { transform: translateX(0%) translateZ(0); }
    100% { transform: translateX(-50%) translateZ(0); }
  }
`

const TickerComponent = ({ logos, duration = 30 }: TickerProps) => {
  const duplicatedLogos = [...logos, ...logos]

  return (
    <div className="relative w-full overflow-hidden">
      {/* Gradient Fades: This is a more performant way to create the fade-out effect than using mask-image, which can cause rendering glitches during animation. */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-1/5 bg-gradient-to-r from-zinc-1000 to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/5 bg-gradient-to-l from-zinc-1000 to-transparent z-10" />

      <style>{tickerKeyframes}</style>
      <div
        className="flex items-center"
        style={{
          animation: `ticker ${duration}s linear infinite`,
          width: 'max-content',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        } as React.CSSProperties}
      >
        {duplicatedLogos.map((logo, i) => (
          <div key={`${logo.src}-${i}`} className="flex-shrink-0 h-8 flex items-center px-6 md:px-8">
            <Image src={logo.src} alt={logo.alt} width={120} height={32} className="h-full w-auto object-contain" />
          </div>
        ))}
      </div>
    </div>
  )
}

export const Ticker = React.memo(TickerComponent)