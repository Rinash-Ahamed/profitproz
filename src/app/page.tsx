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

export default function Home() {
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
        title: 'One platform Every OTA Complete Control',
        subtitle: 'we make property listing and management effortless across multiple ota\'s',
        theme: {
          glowA: 'rgba(59,130,246,0.18)',
          glowB: 'rgba(96,165,250,0.14)',
          grid: 'rgba(255,255,255,0.025)',
          accent: '#60A5FA',
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

        {/* Premium hero backdrop */}
        <motion.div
          className="absolute inset-0 pointer-events-none select-none overflow-hidden will-change-transform"
          initial={false}
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
            scale: [0.985, 1.01, 0.99],
            opacity: [0.82, 1, 0.9],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          style={{
            backgroundImage:
              `radial-gradient(circle at top left, ${activeMessage.theme.glowA}, transparent 34%), ` +
              `radial-gradient(circle at 80% 18%, ${activeMessage.theme.glowB}, transparent 24%), ` +
              `linear-gradient(${activeMessage.theme.grid} 1px, transparent 1px), ` +
              `linear-gradient(90deg, ${activeMessage.theme.grid} 1px, transparent 1px)`,
            backgroundSize: 'auto, auto, 72px 72px, 72px 72px',
            maskImage: 'radial-gradient(ellipse 92% 80% at 50% 10%, black 28%, transparent 100%)',
            transform: 'perspective(1400px) translate3d(0,0,0)',
            filter: 'contrast(1.08) saturate(1.08)',
          }}
        />

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[0, 1, 2, 3].map((index) => (
            <motion.div
              key={`${activeMessage.title}-${index}`}
              className="absolute bottom-0 rounded-full"
              style={{
                left: `${8 + index * 22}%`,
                width: `${96 + index * 18}px`,
                height: `${120 + index * 18}px`,
                background: `linear-gradient(180deg, ${activeMessage.theme.accent}28 0%, transparent 84%)`,
                border: `1px solid ${activeMessage.theme.accent}28`,
                boxShadow: `0 0 32px ${activeMessage.theme.accent}16`,
                transformOrigin: 'bottom center',
              }}
              initial={{ y: '84%', opacity: 0.18, scaleY: 0.9 }}
              animate={{ y: ['84%', '-12%'], opacity: [0.18, 0.72], scaleY: [0.9, 1.05] }}
              transition={{ duration: 3.2 + index * 0.35, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
            />
          ))}

          <motion.div
            className="absolute inset-x-0 bottom-0 h-[46%]"
            initial={{ opacity: 0.28 }}
            animate={{ opacity: [0.28, 0.6, 0.3] }}
            transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg viewBox="0 0 1600 800" className="w-full h-full opacity-80" fill="none">
              <path d="M0 720C120 660 220 560 310 520C408 476 486 510 580 470C686 426 760 310 858 286C956 262 1048 338 1148 324C1244 310 1322 214 1422 204C1498 196 1560 224 1600 248" stroke={activeMessage.theme.accent} strokeWidth="1.4" strokeLinecap="round" />
              <path d="M0 760C140 712 232 646 332 612C430 580 520 610 610 580C706 548 768 452 870 430C970 408 1054 482 1156 472C1262 462 1338 380 1444 364C1518 352 1568 370 1600 382" stroke={activeMessage.theme.accent} strokeOpacity="0.45" strokeWidth="1" strokeLinecap="round" />
              <path d="M120 670H320M300 610H500M480 548H680M670 486H850M840 424H1040M1020 368H1220M1180 306H1400" stroke={activeMessage.theme.accent} strokeOpacity="0.28" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </motion.div>
        </div>

        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            background: `radial-gradient(circle at top, rgba(255,255,255,0.1), transparent 58%)`,
            boxShadow: `inset 0 -70px 130px -70px ${activeMessage.theme.glowA}`,
          }}
        />

        {/* Accent dots - static, no JS */}
        <div className="absolute top-[28%] left-[10%] w-1.5 h-1.5 rounded-full bg-blue-500 pulse-dot" />
        <div className="absolute top-[60%] right-[14%] w-1 h-1 rounded-full bg-blue-400 pulse-dot" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[42%] right-[34%] w-1 h-1 rounded-full bg-zinc-600 pulse-dot" style={{ animationDelay: '1.8s' }} />

        <motion.div
          style={{ y: headY, opacity: headO }}
          className="relative z-10 max-w-6xl mx-auto w-full px-6 md:px-10"
        >
          {/* Live status pill */}
          <motion.div
            className="inline-flex items-center gap-2.5 surface px-3.5 py-1.5 rounded-full mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: ease.out, delay: 0.12 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 pulse-dot" />
            <span className="label-upper text-sub">Turn potential into profit...</span>
          </motion.div>

          {/* Headline */}
          <motion.div
            key={activeMessage.title}
            className="max-w-4xl flex flex-col items-start gap-4"
            initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="display-xl text-ink leading-[0.92] tracking-[-0.035em] max-w-3xl">
              {activeMessage.title}
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
              className="glow-blue inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-sans font-semibold text-sm px-6 py-3 rounded-lg transition-all duration-200 w-full sm:w-auto"
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
              { icon: '★', text: 'Early-stage growth focus' },
              { icon: '◈', text: 'No lock-in contracts' },
              { icon: '◉', text: 'Launch support in 14 days' },
            ].map((t) => (
              <div key={t.text} className="flex items-center gap-2">
                <span className="text-blue-500 text-xs">{t.icon}</span>
                <span className="text-ghost text-xs font-sans">{t.text}</span>
              </div>
            ))}
          </motion.div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch">
            <div className="relative h-[320px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
              <Image
                src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80"
                alt="Luxury hotel room showcasing premium hospitality"
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-4">
              <div className="relative h-[150px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                <Image
                  src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80"
                  alt="Modern hotel lobby and reception"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="surface rounded-2xl p-5">
                <p className="label-upper text-blue-400 mb-2">Property storytelling</p>
                <p className="text-sub text-sm leading-relaxed">
                  Better positioning, polished presentation, and a sharper booking experience make the difference between a good stay and a fully booked one.
                </p>
              </div>
            </div>
          </div>
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
      <Ticker />

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
