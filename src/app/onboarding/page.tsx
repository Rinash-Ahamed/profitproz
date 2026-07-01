'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { useInView } from '@/hooks/useInView'
import { ease } from '@/lib/utils'
import Link from 'next/link'

/* ── Journey stages ─────────────────────────────────── */
const stages = [
  {
    day: 'Day 1',
    title: 'Assessment & Account Setup',
    icon: '◈',
    desc: 'We start with a thorough assessment of your property, then register and verify you on all major OTA platforms simultaneously. This includes handling paperwork, compliance, and extranet access.',
    tasks: [
      'Existing OTA audit and performance review',
      'Account creation on 7+ platforms',
      'GST and legal compliance documents submitted',
      'Photo quality and gap assessment',
      'Connectivity partner relationships established',
    ],
    deliverable: 'All OTA accounts live and accessible',
  },
  {
    day: 'Day 2',
    title: 'Content & Rate Configuration',
    icon: '◎',
    desc: 'We write platform-specific descriptions, configure amenities, and sequence photos for maximum impact. Simultaneously, we build your rate structure, load seasonal pricing, and establish parity monitoring from day one.',
    tasks: [
      'SEO-optimised property descriptions for each platform',
      'Room type hierarchy and naming conventions set',
      'Base rates, seasonal rates, and promotions loaded',
      'Photo sequence optimised for click-through rate',
      'Rate parity monitoring established',
    ],
    deliverable: 'Fully written listings with live rates',
  },
  {
    day: 'Day 3',
    title: 'Integration & Go-Live',
    icon: '◉',
    desc: 'Your channel manager is connected and tested with full two-way sync. After successful tests, all listings are activated. We monitor your first bookings and provide a full handover with credentials and guides.',
    tasks: [
      'Channel manager connected and validated',
      'Two-way inventory sync tested on each OTA',
      'All 7 listings activated and searchable',
      'First 24 hours of bookings monitored',
      'Login credentials and platform guides handed over',
    ],
    deliverable: 'Live hotel, first bookings, full handover',
  },
]

export default function OnboardingPage() {
  const [active, setActive] = useState(0)
  const hero    = useInView(0.1)
  const journey = useInView(0.05)
  const why     = useInView(0.1)
  const cta     = useInView(0.2)

  const stage = stages[active]

  return (
    <div className="min-h-screen bg-zinc-1000">
      <Nav />

      {/* ── HERO ─────────────────────────────────────── */}
      <section ref={hero.ref as React.RefObject<HTMLElement>} className="relative pt-32 pb-16 px-6 md:px-10 max-w-6xl mx-auto overflow-hidden">
        {/* Subtle animated background */}
        <motion.div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(102, 177, 89, 0.1), transparent),
                            radial-gradient(ellipse 50% 40% at 20% 110%, rgba(102, 177, 89, 0.08), transparent),
                            radial-gradient(ellipse 50% 40% at 80% 100%, rgba(102, 177, 89, 0.08), transparent)`,
            backgroundRepeat: 'no-repeat',
          }}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={hero.inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1.2, ease: ease.out }}
        />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={hero.inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, ease: ease.out }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-2 rounded-full bg-[#66B159] pulse-dot" />
            <span className="label-upper text-sub">Hotel Onboarding</span>
          </div>
          <h1 className="headline text-ink mb-7">
            Listed everywhere <span className="text-[#66B159]">Booked constantly.</span>
          </h1>
          <p className="text-sub text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
            Most hotels spend 2 to 4 months getting their OTA setup right. We do it completely, correctly, and across every major OTA - in just 3 days.
          </p>

          {/* Three badges */}
          <div className="flex flex-wrap gap-3 mb-10">
            {[
              { label: 'Time to go live', value: '3 Days', sub: 'average across OTAs' },
              { label: 'Platforms covered', value: '7+ OTAs', sub: 'simultaneously, from day one' },
              { label: 'Hidden costs', value: 'None', sub: 'transparent pricing only' },
            ].map((b) => (
              <div key={b.label} className="surface-accent rounded-xl px-5 py-4">
                <p className="label-upper text-[#66B159] mb-1.5">{b.label}</p>
                <p className="font-sans font-bold text-ink text-xl tracking-tight mb-0.5">{b.value}</p>
                <p className="text-ghost text-xs font-sans">{b.sub}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="inline-flex items-center gap-2 bg-[#66B159] hover:bg-[#73bd66] text-[#FFFCFC] font-sans font-semibold text-sm px-6 py-3 rounded-lg transition-colors duration-200">
              Start Onboarding
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link href="/revenue" className="inline-flex items-center justify-center bg-transparent border border-[#66B159] text-ink hover:bg-[#66B159]/10 font-sans text-sm px-6 py-3 rounded-lg transition-colors duration-200">
              Also need revenue management ?
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── WHY IT'S HARD ────────────────────────────── */}
      <section ref={why.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-20 max-w-6xl mx-auto">
        <motion.div
          className="surface rounded-2xl p-8 md:p-10"
          initial={{ opacity: 0, y: 20 }}
          animate={why.inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: ease.out }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <p className="label-upper text-sub mb-4">The problem</p>
              <h3 className="font-sans font-bold text-ink mb-4" style={{ fontSize: '1.5rem', lineHeight: 1.15, letterSpacing: '-0.03em' }}>
                Why most hotels do OTA setup badly
              </h3>
              <p className="text-sub text-sm leading-relaxed">
                Getting listed is easy. Getting listed correctly isn't. <br /><br />
                Every OTA has its own rules for room types, content, photos, pricing, and search visibility. Small setup mistakes - like incorrect room mapping, weak descriptions, or unoptimized images - can push your property down the rankings and reduce bookings. <br /><br />
                Most hotels never revisit these settings after launch, leaving revenue on the table every single day. We make sure your listings are optimized from day one.<br />
              </p>
            </div>
            <div className="space-y-3">
              {[
                { problem: 'Wrong room type configuration', impact: 'Guests book the wrong rooms, complaints follow' },
                { problem: 'Generic listing copy', impact: 'Poor search ranking, low click-through rate' },
                { problem: 'Photos in wrong order', impact: 'First image determines whether guests even read on' },
                { problem: 'No rate parity monitoring', impact: 'OTAs penalise listings with parity violations' },
                { problem: 'Manual inventory management', impact: 'Overbooking risk and constant manual updates' },
              ].map((r) => (
                <div key={r.problem} className="flex items-start gap-3 p-3.5 rounded-lg bg-zinc-900">
                  <div className="w-4 h-4 rounded-sm bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-400" style={{ fontSize: '0.55rem' }}>✕</span>
                  </div>
                  <div>
                    <p className="text-ink text-xs font-sans font-medium">{r.problem}</p>
                    <p className="text-ghost text-xs font-sans">{r.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── JOURNEY ──────────────────────────────────── */}
      <section ref={journey.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-24 max-w-6xl mx-auto border-t border-zinc-800 pt-20">
        <motion.div className="mb-10" initial={{ opacity: 0, y: 16 }} animate={journey.inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: ease.out }}>
          <p className="label-upper text-sub mb-3">The Process</p>
          <h2 className="headline text-ink">Three days <span className="text-[#66B159]">Step by step</span></h2>
        </motion.div>

        {/* Progress bar */}
        <motion.div className="flex gap-1 mb-8" initial={{ opacity: 0 }} animate={journey.inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
          {stages.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to stage ${i + 1}: ${stages[i].title}`}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{ backgroundColor: i <= active ? '#66B159' : '#27272A' }}
              onClick={() => setActive(i)} />
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Stage list */}
          <div className="lg:col-span-2 space-y-1">
            {stages.map((s, i) => (
              <motion.button key={s.title} className={`w-full text-left px-4 py-3.5 rounded-xl flex items-center gap-3 transition-all duration-200 ${active === i ? 'surface-accent' : 'hover:bg-zinc-900'}`}
                onClick={() => setActive(i)}
                initial={{ opacity: 0, x: -12 }}
                animate={journey.inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.05 + 0.15, duration: 0.5, ease: ease.out }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 text-sm"
                  style={{ backgroundColor: active === i ? 'rgba(102, 177, 89, 0.18)' : '#1C1C1F', color: active === i ? '#66B159' : '#52525B', border: active === i ? '1px solid rgba(102, 177, 89, 0.28)' : '1px solid #27272A' }}>
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <p className={`font-sans text-sm font-medium truncate ${active === i ? 'text-ink' : 'text-sub'}`}>{s.title}</p>
                  <p className="label-upper text-ghost">{s.day}</p>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Stage detail */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div key={stage.title} className="surface-accent rounded-2xl p-8 h-full flex flex-col"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: ease.out }}
              >
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="label-upper text-[#66B159] mb-1.5">{stage.day}</p>
                    <h3 className="font-sans font-bold text-ink text-xl">{stage.title}</h3>
                  </div>
                  <div className="text-[#66B159] text-2xl flex-shrink-0">{stage.icon}</div>
                </div>

                <p className="text-sub text-sm leading-relaxed mb-7">{stage.desc}</p>

                <div className="space-y-2 mb-6">
                  {stage.tasks.map((task) => (
                    <div key={task} className="flex items-start gap-2.5 surface rounded-lg px-3.5 py-2.5">
                      <div className="w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(102, 177, 89, 0.15)' }}>
                        <svg width="8" height="7" viewBox="0 0 8 7" fill="none"><path d="M1 3.5L3 5.5L7 1" stroke="#66B159" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span className="text-sub text-xs font-sans leading-relaxed">{task}</span>
                    </div>
                  ))}
                </div>

                {/* Deliverable */}
                <div className="mt-auto pt-4 border-t border-zinc-800/60 flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#66B159] flex-shrink-0" />
                  <span className="text-[#66B159] text-xs font-sans font-medium">Deliverable: {stage.deliverable}</span>
                </div>

                {active < stages.length - 1 && (
                  <button className="mt-4 flex items-center gap-2 text-ghost hover:text-sub text-xs font-sans transition-colors duration-200"
                    onClick={() => setActive(active + 1)}>
                    <span>Next: {stages[active + 1].title}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section ref={cta.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-24 max-w-6xl mx-auto">
        <motion.div className="surface rounded-2xl p-12 md:p-16 text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={cta.inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: ease.out }}
        >
          <p className="label-upper text-[#66B159] mb-5">500+ Hotels Onboarded</p>
          <h2 className="headline text-ink mb-4">3 days to fully live <span className="text-[#66B159]">Let's begin today.</span></h2>
          <p className="text-sub text-sm max-w-md mx-auto mb-10 leading-relaxed">
            The process is proven, the timeline is real, and we've done it for hotels across India - from 10 room to 100+ room city hotels.
          </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/contact" className="inline-flex items-center gap-2 bg-[#66B159] hover:bg-[#73bd66] text-[#FFFCFC] font-sans font-semibold text-sm px-9 py-4 rounded-xl transition-colors duration-200">
              Start My Onboarding
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link href="/revenue" className="inline-flex items-center justify-center bg-transparent border border-[#66B159] text-ink hover:bg-[#66B159]/10 font-sans text-sm px-6 py-3 rounded-lg transition-colors duration-200">
              Add Revenue Management
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
