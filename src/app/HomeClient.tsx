'use client'
import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useVisibleActivity } from '@/hooks/useVisibleActivity'

const activeMessage = {
  titleLines: ['One Platform', 'Every OTA'],
  lastLine: 'Complete Control',
  subtitle: 'We make property listing and management effortless across multiple OTAs.',
  theme: { glowA: 'rgba(102, 177, 89, 0.18)', accent: '#66B159' },
}

export default function HomeClient() {
  const reduceMotion = useReducedMotion()
  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const heroActive = useVisibleActivity(heroRef)

  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return

    if (reduceMotion) {
      video.pause()
      video.currentTime = 0
      return
    }

    if (heroActive) void video.play().catch(() => undefined)
    else video.pause()
  }, [reduceMotion, heroActive])

  return (
      <section ref={heroRef} data-paused={!heroActive} className="home-hero relative min-h-[88svh] md:min-h-[96vh] flex flex-col justify-center pt-20 pb-12 md:pb-0 overflow-hidden">
        <div className="ambient-glow left-[-8rem] top-[8rem] h-56 w-56" />
        <div className="ambient-glow right-[-6rem] top-[16rem] h-72 w-72" style={{ animationDelay: '2s' }} />

        {/* Video Background */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <video
            ref={heroVideoRef}
            loop={!reduceMotion}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover [content-visibility:visible]"
            style={{ maskImage: 'radial-gradient(ellipse 92% 80% at 50% 10%, black 28%, transparent 100%)' }}
            poster="/grow-poster-v1.webp"
            src="/grow-silent-v1.mp4"
          />
          <div className="absolute inset-0 bg-zinc-1000/60 md:bg-zinc-1000/70" />
        </div>

        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            background: `radial-gradient(circle at top, rgba(255,255,255,0.1), transparent 58%)`,
            boxShadow: `inset 0 -70px 130px -70px ${activeMessage.theme.glowA}`,
          }}
        />

        {/* Accent dots - static, no JS */}
        <div className="absolute top-[28%] left-[10%] w-1.5 h-1.5 rounded-full bg-[#66B159] pulse-dot" />
        <div className="absolute top-[60%] right-[14%] w-1 h-1 rounded-full bg-[#66B159] pulse-dot" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[42%] right-[34%] w-1 h-1 rounded-full bg-zinc-600 pulse-dot" style={{ animationDelay: '1.8s' }} />

        <div className="relative z-10 max-w-6xl mx-auto w-full px-6 md:px-10">
          {/* Live status pill */}
          <div
            className="hero-pill-enter inline-flex items-center gap-2.5 glass-pill px-4 py-2 rounded-full mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#66B159] pulse-dot" />
            <span className="label-upper text-ink/80">Turn potential into profit...</span>
          </div>

          {/* Headline */}
          <div
            key={activeMessage.lastLine}
            className="hero-headline-enter max-w-4xl flex flex-col items-start gap-4"
          >
            <h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-ink font-bold leading-none tracking-tighter max-w-4xl"
            >
              {activeMessage.titleLines.map((line, i) => <span key={i}>{line}<br /></span>)}
              <span style={{ color: activeMessage.theme.accent }}>{activeMessage.lastLine}</span>
            </h1>
            <p
              className="max-w-2xl text-base sm:text-lg leading-relaxed text-ink/80 italic"
            >
              {activeMessage.subtitle}
            </p>
          </div>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-8 mt-6">
          <a
            href="/contact"
            className="group inline-flex items-center justify-center gap-2 bg-[#66B159] hover:bg-[#73bd66] text-[#FFFCFC] font-sans font-semibold text-sm px-6 py-3 rounded-lg transition-colors duration-200 w-full sm:w-auto"
          >
              Get a Free Revenue Audit
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform duration-200 group-hover:translate-x-1">
                <path
                  d="M2 7h10M8 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <a
              href="/revenue"
              className="inline-flex items-center justify-center gap-2 bg-transparent border border-[#66B159] text-ink hover:bg-[#66B159]/10 font-sans text-sm px-6 py-3 rounded-lg transition-colors duration-200 w-full sm:w-auto"
            >
              Revenue Management
            </a>
            <a
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 bg-transparent border border-[#66B159] text-ink hover:bg-[#66B159]/10 font-sans text-sm px-6 py-3 rounded-lg transition-colors duration-200 w-full sm:w-auto"
            >
              Hotel Onboarding
            </a>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {[
              { text: 'Early-stage growth focus' },
              { text: 'No lock-in contracts' },
              { text: 'Launch support in 14 days' },
            ].map((t) => (
              <div key={t.text} className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#66B159]">
                  <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sub text-sm font-sans">{t.text}</span>
              </div>
            ))}
          </div>
        </div>

      </section>
  )
}
