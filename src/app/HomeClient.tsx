'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { Ticker } from '@/components/sections/Ticker'
import { ServiceCards } from '@/components/sections/ServiceCards'
import { Stats } from '@/components/sections/Stats'
import { Testimonials } from '@/components/sections/Testimonials'
import { HomeCTA } from '@/components/sections/HomeCTA'
import { ease } from '@/lib/utils'

export default function HomeClient({ otaLogos }: { otaLogos: { src: string; alt: string }[] }) {
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const headY = useTransform(scrollYProgress, [0, 1], [0, 60])
  const headO = useTransform(scrollYProgress, [0, 0.65], [1, 0])
  const ctaY = useTransform(scrollYProgress, [0, 0.45], [-24, 0])
  const ctaO = useTransform(scrollYProgress, [0, 0.2, 0.45], [1, 0.94, 0.2])
  const trustY = useTransform(scrollYProgress, [0, 0.55], [-16, 0])
  const trustO = useTransform(scrollYProgress, [0, 0.25, 0.55], [1, 0.94, 0.2])
  const [messageIndex, setMessageIndex] = useState(0)

  const heroMessages = useMemo(
    () => [
      {
        titleLines: ['One Platform', 'Every OTA'],
        lastLine: 'Complete Control',
        subtitle: 'we make property listing and management effortless across multiple ota\'s',
        theme: {
          glowA: 'rgba(102, 177, 89, 0.18)',
          glowB: 'rgba(102, 177, 89, 0.14)',
          grid: 'rgba(255,255,255,0.025)',
          accent: '#66B159',
        },
      },
    ],
    []
  )

  useEffect(() => {
    const id = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % heroMessages.length)
    }, 5600)

    return () => window.clearInterval(id)
  }, [heroMessages.length])

  const activeMessage = heroMessages[messageIndex]

  return (
    <div className="min-h-screen bg-zinc-1000">
      <Nav />

      {/* ── HERO ─────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-[96vh] flex flex-col justify-center pt-20 overflow-hidden">

        {/* Video Background */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ maskImage: 'radial-gradient(ellipse 92% 80% at 50% 10%, black 28%, transparent 100%)' }}
            src="/grow.mp4"
          />
          <div className="absolute inset-0 bg-zinc-1000/70" />
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

        <motion.div
          style={{ y: headY, opacity: headO }}
          className="relative z-10 max-w-6xl mx-auto w-full px-6 md:px-10"
        >
          {/* Live status pill */}
          <motion.div
            className="inline-flex items-center gap-2.5 glass-pill px-4 py-2 rounded-full mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: ease.out, delay: 0.12 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#66B159] pulse-dot" />
            <span className="label-upper text-ink/80">Turn potential into profit...</span>
          </motion.div>

          {/* Headline */}
          <motion.div
            key={activeMessage.lastLine}
            className="max-w-4xl flex flex-col items-start gap-4"
            initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1
              className="display-xl text-ink leading-[0.98] tracking-[-0.035em] max-w-4xl"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}
            >
              {activeMessage.titleLines.map((line, i) => <span key={i}>{line}<br /></span>)}
              <span style={{ color: activeMessage.theme.accent }}>{activeMessage.lastLine}</span>
            </h1>
            <p
              className="max-w-2xl text-lg sm:text-xl md:text-2xl leading-relaxed text-sub font-[family-name:var(--font-instrument),Georgia,serif] italic"
              style={{ color: activeMessage.theme.accent }}
            >
              {activeMessage.subtitle}
            </p>
          </motion.div>

          {/* CTA row */}
          <motion.div
            className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-12 mt-8"
            style={{ y: ctaY, opacity: ctaO }}
          >
            <a
              href="/contact"
              className="glow-green inline-flex items-center justify-center gap-2 bg-[#66B159] hover:bg-[#73bd66] text-[#FFFCFC] font-sans font-semibold text-sm px-6 py-3 rounded-lg transition-all duration-200 w-full sm:w-auto"
            >
              Get a Free Revenue Audit
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a
              href="/revenue"
              className="inline-flex items-center justify-center gap-2 surface hover:border-zinc-600 text-sub hover:text-ink font-sans text-sm px-6 py-3 rounded-lg transition-colors duration-200 w-full sm:w-auto"
            >
              Revenue Management
            </a>
            <a
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 surface hover:border-zinc-600 text-sub hover:text-ink font-sans text-sm px-6 py-3 rounded-lg transition-colors duration-200 w-full sm:w-auto"
            >
              Hotel Onboarding
            </a>
          </motion.div>

          {/* Trust row */}
          <motion.div
            className="flex flex-wrap items-center gap-4 sm:gap-6"
            style={{ y: trustY, opacity: trustO }}
          >
            {[
              { icon: '◉', text: 'Early-stage growth focus' },
              { icon: '◉', text: 'No lock-in contracts' },
              { icon: '◉', text: 'Launch support in 14 days' },
            ].map((t) => (
              <div key={t.text} className="flex items-center gap-2">
                <span className="text-[#66B159] text-xs">{t.icon}</span>
                <span className="text-ghost text-xs font-sans">{t.text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          style={{ opacity: headO }}
        >
          <motion.div
            className="w-px h-10 bg-gradient-to-b from-zinc-700 to-transparent"
            animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="label-upper text-ghost">Scroll</span>
        </motion.div>
      </section>

      {/* ── LIVE TICKER ──────────────────────────────── */}
      {otaLogos.length > 0 && (
        <div className="py-16 text-center">
          <p className="label-upper text-ghost mb-6">Powering listings on every major platform</p>
          <Ticker logos={otaLogos} />
        </div>
      )}

      {/* ── SERVICES ─────────────────────────────────── */}
      <ServiceCards />

      {/* ── STATS ────────────────────────────────────── */}
      <Stats />

      {/* ── TESTIMONIALS ─────────────────────────────── */}
      <Testimonials />

      {/* ── CTA ──────────────────────────────────────── */}
      <HomeCTA />

      <Footer />
    </div>
  )
}