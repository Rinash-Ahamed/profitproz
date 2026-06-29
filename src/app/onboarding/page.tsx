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
    day: 'Day 1–2',
    title: 'Property Assessment',
    icon: '◈',
    desc: 'Before we create a single listing, we do a thorough assessment of your property. We review your existing digital presence (if any), photo quality, facilities inventory, room configuration, and how your competitors are positioned. This audit shapes every listing decision that follows.',
    tasks: [
      'Existing OTA audit and performance review',
      'Facilities and room type documentation',
      'Photo quality and gap assessment',
      'Competitive positioning analysis',
      'Recommended room category structure',
    ],
    deliverable: 'Written assessment report with recommendations',
  },
  {
    day: 'Day 2–3',
    title: 'OTA Account Setup',
    icon: '⬡',
    desc: 'We register and verify your property on all 7 OTA platforms simultaneously. This includes handling the paperwork, GST documentation, legal compliance, bank account verification, and extranet access setup. Most properties find this stage alone takes weeks - we do it in two days.',
    tasks: [
      'Account creation: MakeMyTrip, Booking.com, Agoda, Yatra, Expedia, Goibibo, Airbnb',
      'GST and legal compliance documents submitted',
      'Bank account and payout details verified',
      'Extranet access configured and tested',
      'Connectivity partner relationships established',
    ],
    deliverable: 'All 7 OTA accounts live and accessible',
  },
  {
    day: 'Day 3–5',
    title: 'Content & Listing Creation',
    icon: '◎',
    desc: 'Each OTA has a different search algorithm. A listing optimised for Booking.com is not the same as one optimised for MakeMyTrip. We write platform-specific descriptions with the right keywords, configure amenity flags correctly, sequence photos for maximum click-through, and set policies that reduce friction for the guest.',
    tasks: [
      'SEO-optimised property descriptions written for each platform',
      'Room type descriptions and naming conventions set',
      'Amenity, facility and accessibility flags configured',
      'Photo sequence optimised for click-through rate',
      'Cancellation and guest policies defined per platform',
    ],
    deliverable: 'Fully written listings on all 7 platforms',
  },
  {
    day: 'Day 5–6',
    title: 'Rate & Inventory Setup',
    icon: '◇',
    desc: 'Room types are built correctly, base rates loaded, seasonal adjustments structured, and cancellation rate fences created. Rate parity is established and monitored from day one. This is the stage most hotels get wrong - wrong room type names, wrong base rates, missing non-refundable options - we get it right the first time.',
    tasks: [
      'Room type hierarchy configured and linked',
      'Base rates, seasonal rates and promotional rates loaded',
      'Non-refundable and flexible rate options created',
      'Rate parity monitoring established across all channels',
      'Minimum stay and advance purchase restrictions applied',
    ],
    deliverable: 'All rates live with parity confirmed',
  },
  {
    day: 'Day 6',
    title: 'Channel Manager Integration',
    icon: '⬙',
    desc: 'Your channel manager is connected to all 7 OTAs with full two-way sync. We run test bookings on each platform, validate that inventory reduces correctly, and confirm that modifications and cancellations flow back accurately. Nothing goes live until every test passes.',
    tasks: [
      'Channel manager connected and credentials validated',
      'Two-way inventory sync tested on each OTA',
      'Test booking placed and cancelled on each platform',
      'Rate and availability push confirmed end-to-end',
      'Overbooking protections and buffer rooms configured',
    ],
    deliverable: 'Fully tested, live channel distribution',
  },
  {
    day: 'Day 7',
    title: 'Go Live & Handover',
    icon: '◉',
    desc: 'All listings are activated simultaneously. We monitor your first real bookings live - watching for any sync issues, guest questions, or rate anomalies. You receive a handover document with login credentials, platform contacts, and a guide for managing day-to-day updates. Ongoing revenue management starts from this point.',
    tasks: [
      'All 7 listings activated and searchable',
      'First 24 hours of bookings monitored in real time',
      'Guest-facing communication templates provided',
      'Login credentials and platform guides handed over',
      'Transition to ongoing revenue management',
    ],
    deliverable: 'Live hotel, first bookings, full handover',
  },
]

/* ── Platforms ──────────────────────────────────────── */
const platforms = [
  { name: 'MakeMyTrip', abbr: 'MMT', reach: '50M+ users', detail: 'India\'s largest OTA. Dominant in domestic leisure and family travel. Critical for any Indian hotel.', dot: '#E53E3E' },
  { name: 'Booking.com', abbr: 'BDC', reach: '150M+ users', detail: 'Global leader with the widest international reach. Essential for any hotel targeting foreign guests.', dot: '#2B6CB0' },
  { name: 'Agoda', abbr: 'AGD', reach: '35M+ users', detail: 'Dominant across Asia-Pacific. Strong corporate and business travel segment, particularly for South-East Asian guests.', dot: '#E53E3E' },
  { name: 'Yatra', abbr: 'YTR', reach: '15M+ users', detail: 'Trusted Indian OTA with strong penetration in Tier 2 and Tier 3 cities. Good for domestic business travel.', dot: '#DD6B20' },
  { name: 'Expedia', abbr: 'EXP', reach: '70M+ users', detail: 'Major reach into US and European travellers. Includes Hotels.com and Vrbo in the same content network.', dot: '#D69E2E' },
  { name: 'Goibibo', abbr: 'GIB', reach: '25M+ users', detail: 'Tech-forward Indian OTA popular with millennial and Gen-Z domestic travellers. Strong mobile booking volumes.', dot: '#2B6CB0' },
  { name: 'Airbnb', abbr: 'ABB', reach: '40M+ users', detail: 'Fastest growing platform for boutique, unique, and non-traditional stays. High ADR and lower commission than most OTAs.', dot: '#E53E3E' },
]

export default function OnboardingPage() {
  const [active, setActive] = useState(0)
  const hero    = useInView(0.1)
  const journey = useInView(0.05)
  const plat    = useInView(0.08)
  const why     = useInView(0.1)
  const cta     = useInView(0.2)

  const stage = stages[active]

  return (
    <div className="min-h-screen bg-zinc-1000">
      <Nav />

      {/* ── HERO ─────────────────────────────────────── */}
      <section ref={hero.ref as React.RefObject<HTMLElement>} className="pt-32 pb-16 px-6 md:px-10 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={hero.inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, ease: ease.out }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-2 rounded-full bg-blue-500 pulse-dot" />
            <span className="label-upper text-sub">Hotel Onboarding</span>
            <div className="h-px flex-1 max-w-24 bg-zinc-800" />
            <span className="label-upper text-ghost">Service 02</span>
          </div>
          <h1 className="display-xl text-ink mb-3 max-w-3xl">Listed everywhere.</h1>
          <h1 className="display-serif text-blue-400 mb-7">Booked constantly.</h1>
          <p className="text-sub text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
            Getting a hotel correctly listed on 7 OTAs - with optimised content, proper room types, rate parity, and a working channel sync - takes most properties 3 to 6 months. We do it completely, correctly, in 7 days.
          </p>

          {/* Three badges */}
          <div className="flex flex-wrap gap-3 mb-10">
            {[
              { label: 'Time to go live', value: '7 Days', sub: 'average across 7 OTAs' },
              { label: 'Platforms covered', value: '7 OTAs', sub: 'simultaneously, from day one' },
              { label: 'Hidden costs', value: 'None', sub: 'transparent pricing only' },
            ].map((b) => (
              <div key={b.label} className="surface-accent rounded-xl px-5 py-4">
                <p className="label-upper text-blue-400 mb-1.5">{b.label}</p>
                <p className="font-sans font-bold text-ink text-xl tracking-tight mb-0.5">{b.value}</p>
                <p className="text-ghost text-xs font-sans">{b.sub}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="glow-blue inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-sans font-semibold text-sm px-6 py-3 rounded-lg transition-all duration-200">
              Start Onboarding
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link href="/revenue" className="surface hover:border-zinc-600 text-sub hover:text-ink font-sans text-sm px-6 py-3 rounded-lg transition-colors duration-200 inline-flex items-center">
              Also need revenue management? →
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
                OTA extranets are not intuitive. Each platform has different terminology for room types, different requirements for photos, different content fields, and different algorithms that determine where you rank in search results. A property listed with the wrong room categories, generic copy, and photos in the wrong sequence will consistently underperform - often indefinitely, because nobody revisits what's already live.
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
          <h2 className="headline text-ink">Seven days.<br /><span className="display-serif text-blue-400">Step by step.</span></h2>
        </motion.div>

        {/* Progress bar */}
        <motion.div className="flex gap-1 mb-8" initial={{ opacity: 0 }} animate={journey.inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
          {stages.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to stage ${i + 1}: ${stages[i].title}`}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{ backgroundColor: i <= active ? '#3B82F6' : '#27272A' }}
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
                  style={{ backgroundColor: active === i ? 'rgba(59,130,246,0.18)' : '#1C1C1F', color: active === i ? '#60A5FA' : '#52525B', border: active === i ? '1px solid rgba(59,130,246,0.28)' : '1px solid #27272A' }}>
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
                    <p className="label-upper text-blue-400 mb-1.5">{stage.day}</p>
                    <h3 className="font-sans font-bold text-ink text-xl">{stage.title}</h3>
                  </div>
                  <div className="text-blue-400 text-2xl flex-shrink-0">{stage.icon}</div>
                </div>

                <p className="text-sub text-sm leading-relaxed mb-7">{stage.desc}</p>

                <div className="space-y-2 mb-6">
                  {stage.tasks.map((task) => (
                    <div key={task} className="flex items-start gap-2.5 surface rounded-lg px-3.5 py-2.5">
                      <div className="w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}>
                        <svg width="8" height="7" viewBox="0 0 8 7" fill="none"><path d="M1 3.5L3 5.5L7 1" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span className="text-sub text-xs font-sans leading-relaxed">{task}</span>
                    </div>
                  ))}
                </div>

                {/* Deliverable */}
                <div className="mt-auto pt-4 border-t border-zinc-800/60 flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-blue-400 text-xs font-sans font-medium">Deliverable: {stage.deliverable}</span>
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

      {/* ── PLATFORMS ────────────────────────────────── */}
      <section ref={plat.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-24 max-w-6xl mx-auto border-t border-zinc-800 pt-20">
        <motion.div className="mb-12" initial={{ opacity: 0, y: 16 }} animate={plat.inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: ease.out }}>
          <p className="label-upper text-sub mb-3">Where You'll Be Listed</p>
          <h2 className="headline text-ink">Seven platforms.<br /><span className="display-serif text-blue-400">Fully optimised.</span></h2>
          <p className="text-sub text-sm max-w-xl mt-4 leading-relaxed">Each platform gets a listing tailored to its own algorithm and guest profile. Not one listing copy-pasted seven times.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {platforms.map((p, i) => (
            <motion.div key={p.name} className="surface rounded-xl p-6 hover:border-zinc-600 transition-all duration-200 cursor-default group flex flex-col"
              initial={{ opacity: 0, y: 20 }}
              animate={plat.inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, ease: ease.out, delay: i * 0.06 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.dot + '18', border: `1px solid ${p.dot}28` }}>
                  <span className="font-sans font-bold" style={{ fontSize: '0.6rem', color: p.dot }}>{p.abbr}</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.dot }} />
              </div>
              <p className="font-sans font-semibold text-ink text-sm mb-1">{p.name}</p>
              <p className="text-ghost text-xs font-sans mb-3">{p.reach}</p>
              <p className="text-sub text-xs leading-relaxed flex-1">{p.detail}</p>
              <div className="mt-4 h-px bg-zinc-800 group-hover:bg-blue-500/30 transition-colors duration-300" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section ref={cta.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-24 max-w-6xl mx-auto">
        <motion.div className="surface rounded-2xl p-12 md:p-16 text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={cta.inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: ease.out }}
        >
          <p className="label-upper text-blue-400 mb-5">500+ Hotels Onboarded</p>
          <h2 className="headline text-ink mb-4">7 days to fully live.<br /><span className="display-serif text-blue-400">Let's begin today.</span></h2>
          <p className="text-sub text-sm max-w-md mx-auto mb-10 leading-relaxed">
            The process is proven, the timeline is real, and we've done it for hotels across India - from 10-room boutiques to 200-room city hotels.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/contact" className="glow-blue inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-sans font-semibold text-sm px-9 py-4 rounded-xl transition-all duration-200">
              Start My Onboarding
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link href="/revenue" className="surface-accent inline-flex items-center gap-2 text-blue-400 font-sans font-medium text-sm px-9 py-4 rounded-xl transition-colors duration-200">
              Add Revenue Management
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
