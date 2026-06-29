'use client'
import { motion } from 'framer-motion'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { useInView } from '@/hooks/useInView'
import { useCounter } from '@/hooks/useCounter'
import { ease } from '@/lib/utils'
import Link from 'next/link'

/* ── Bar chart data ─────────────────────────────────── */
const chartData = [
  { month: 'Jan', before: 38, after: 52 },
  { month: 'Feb', before: 42, after: 58 },
  { month: 'Mar', before: 35, after: 54 },
  { month: 'Apr', before: 50, after: 68 },
  { month: 'May', before: 44, after: 65 },
  { month: 'Jun', before: 60, after: 79 },
  { month: 'Jul', before: 55, after: 76 },
  { month: 'Aug', before: 63, after: 85 },
  { month: 'Sep', before: 48, after: 72 },
  { month: 'Oct', before: 58, after: 80 },
  { month: 'Nov', before: 52, after: 78 },
  { month: 'Dec', before: 68, after: 94 },
]

/* ── Services ───────────────────────────────────────── */
const services = [
  {
    icon: '◈',
    title: 'Dynamic Pricing Engine',
    description: 'Rates are recommended daily based on real-time demand signals, your competitor set, local events, and your own historical patterns. No more static pricing that leaves money on the table during peak periods or kills occupancy in soft ones.',
    result: 'Hotels see ADR improvement of 20–40% within 60 days.',
  },
  {
    icon: '⬡',
    title: 'Competitor Rate Intelligence',
    description: 'We track your competitive set across every OTA every single day - rate levels, availability, promotions, and positioning. When a rival drops rates aggressively or a new property enters your market, you\'ll know and we\'ll respond.',
    result: '360° competitive visibility updated daily.',
  },
  {
    icon: '◎',
    title: 'Demand Forecasting',
    description: 'Corporate booking windows, leisure demand patterns, local events, public holidays, and macro travel trends - all built into a demand calendar that tells us when to be aggressive on rate and when to prioritise fill.',
    result: 'Occupancy gaps reduced by 60% on average.',
  },
  {
    icon: '◇',
    title: 'Yield Management',
    description: 'Minimum length of stay controls, close-out dates, non-refundable rate fencing, and channel allocation decisions - all configured to maximise revenue contribution per available room, not just fill rates.',
    result: 'RevPAR indexed above market average for 94% of clients.',
  },
  {
    icon: '⬙',
    title: 'OTA Ranking Optimisation',
    description: 'Search ranking on Booking.com and MakeMyTrip is driven by content quality, review score, response rate, and pricing competitiveness. We manage all four simultaneously so your property appears higher in more searches.',
    result: 'Average 35% improvement in OTA page rank.',
  },
  {
    icon: '◉',
    title: 'Weekly Performance Reporting',
    description: 'Every Monday morning you receive a one-page report: RevPAR vs. last period, occupancy vs. budget, competitor index, what changed in your pricing and why, and what we\'re adjusting this week. Clear numbers, clear reasoning.',
    result: 'No jargon. Just the numbers that matter.',
  },
]

/* ── Process ────────────────────────────────────────── */
const process = [
  {
    week: 'Week 1',
    title: 'Revenue Audit',
    description: 'We analyse 12 months of your pricing history, channel-by-channel revenue contribution, competitor positioning, and missed demand events. The output is a frank assessment of where revenue is being lost and why.',
  },
  {
    week: 'Week 1–2',
    title: 'Strategy Design',
    description: 'A custom revenue strategy blueprint for your property: seasonal rate architecture, comp set definition, demand event calendar, channel mix targets, and yield rule framework. Nothing generic - every hotel gets its own plan.',
  },
  {
    week: 'Week 2–3',
    title: 'System Configuration',
    description: 'Rate rules, restrictions, and yield controls are configured live in your channel manager and OTA extranets. We test every scenario before going live to ensure no rate leakage or parity violations.',
  },
  {
    week: 'Week 3 onwards',
    title: 'Daily Management',
    description: 'Competitor rates tracked, demand signals scanned, rate recommendations reviewed and pushed every working day. Major market events trigger same-day responses. You don\'t need to log in.',
  },
  {
    week: 'Ongoing',
    title: 'Weekly Review & Refinement',
    description: 'Strategy performance is reviewed every week. What\'s working is amplified. What isn\'t is changed. Your market doesn\'t stand still, and neither do we.',
  },
]

/* ── Competitors table ──────────────────────────────── */
const compTable = [
  { name: 'Your Property', rate: '₹8,400', rgi: '1.12', occ: '87%', you: true },
  { name: 'Rival A - Same Star', rate: '₹7,900', rgi: '1.05', occ: '81%', you: false },
  { name: 'Rival B - Same Location', rate: '₹7,200', rgi: '0.96', occ: '76%', you: false },
  { name: 'Rival C - Nearby Hotel', rate: '₹6,800', rgi: '0.91', occ: '79%', you: false },
  { name: 'Market Average', rate: '₹7,575', rgi: '1.00', occ: '80%', you: false },
]

function KPI({ pre, n, suf, label, active }: { pre: string; n: number; suf: string; label: string; active: boolean }) {
  const v = useCounter(n, 2.2, active)
  return (
    <div className="surface-accent rounded-xl p-6">
      <p className="label-upper text-sub mb-3">{label}</p>
      <p className="font-sans font-bold text-ink tracking-tight" style={{ fontSize: '2.6rem', lineHeight: 1 }}>
        <span className="text-blue-400">{pre}</span>{v.toLocaleString()}<span className="text-blue-400">{suf}</span>
      </p>
    </div>
  )
}

export default function RevenuePage() {
  const hero  = useInView(0.1)
  const kpi   = useInView(0.2)
  const dash  = useInView(0.1)
  const svc   = useInView(0.08)
  const proc  = useInView(0.08)
  const cta   = useInView(0.2)

  return (
    <div className="min-h-screen bg-zinc-1000">
      <Nav />

      {/* ── HERO ─────────────────────────────────────── */}
      <section ref={hero.ref as React.RefObject<HTMLElement>} className="pt-32 pb-16 px-6 md:px-10 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={hero.inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, ease: ease.out }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-2 rounded-full bg-blue-500 pulse-dot" />
            <span className="label-upper text-sub">Revenue Management</span>
            <div className="h-px flex-1 max-w-24 bg-zinc-800" />
            <span className="label-upper text-ghost">Service 01</span>
          </div>
          <h1 className="display-xl text-ink mb-3 max-w-3xl">Every night.</h1>
          <h1 className="display-serif text-blue-400 mb-7">Maximum revenue.</h1>
          <p className="text-sub text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
            Most hotels price based on intuition and what worked last year. We replace that with a data-driven revenue engine - competitor rates tracked daily, demand signals captured in advance, and pricing adjusted to maximise what you earn every single night.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="glow-blue inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-sans font-semibold text-sm px-6 py-3 rounded-lg transition-all duration-200">
              Get a Free Revenue Audit
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link href="/onboarding" className="surface hover:border-zinc-600 text-sub hover:text-ink font-sans text-sm px-6 py-3 rounded-lg transition-colors duration-200 inline-flex items-center">
              Also need OTA setup? →
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── KPIs ─────────────────────────────────────── */}
      <section ref={kpi.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPI pre="+" n={38} suf="%" label="Average RevPAR uplift" active={kpi.inView} />
          <KPI pre="+" n={24} suf="%" label="Average ADR growth" active={kpi.inView} />
          <KPI pre="+" n={18} suf=" pts" label="Average occupancy gain" active={kpi.inView} />
        </div>
      </section>

      {/* ── DASHBOARD ────────────────────────────────── */}
      <section ref={dash.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-24 max-w-6xl mx-auto">
        <motion.div className="mb-10" initial={{ opacity: 0, y: 16 }} animate={dash.inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: ease.out }}>
          <p className="label-upper text-sub mb-3">Performance View</p>
          <h2 className="headline text-ink">Results you can measure</h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={dash.inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: ease.out, delay: 0.1 }}
        >
          {/* Chart */}
          <div className="surface rounded-xl p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-sans font-semibold text-ink text-sm mb-0.5">Revenue Per Available Room</p>
                <p className="text-ghost text-xs font-sans">12 months - Before vs. After ProfitPro</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-sub font-sans">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-zinc-700 inline-block" />Before</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />After</span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-1.5 h-40">
              {chartData.map((d, i) => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-end gap-0.5 w-full h-32">
                    <div className="flex-1 flex items-end">
                      <motion.div className="w-full rounded-t-sm bg-zinc-700"
                        initial={{ height: 0 }}
                        animate={dash.inView ? { height: `${(d.before / 100) * 128}px` } : {}}
                        transition={{ duration: 0.7, ease: ease.out, delay: i * 0.04 }}
                      />
                    </div>
                    <div className="flex-1 flex items-end">
                      <motion.div className="w-full rounded-t-sm"
                        style={{ background: 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)' }}
                        initial={{ height: 0 }}
                        animate={dash.inView ? { height: `${(d.after / 100) * 128}px` } : {}}
                        transition={{ duration: 0.8, ease: ease.out, delay: i * 0.04 + 0.12 }}
                      />
                    </div>
                  </div>
                  <span className="text-ghost font-sans" style={{ fontSize: '0.55rem' }}>{d.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Comp table */}
            <div className="surface rounded-xl p-6">
              <p className="label-upper text-sub mb-4">Competitor Intelligence - Live View</p>
              <div className="space-y-1.5">
                {compTable.map((c) => (
                  <div key={c.name} className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${c.you ? 'surface-accent' : ''}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {c.you && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                      <span className={`font-sans text-xs truncate ${c.you ? 'text-blue-400 font-semibold' : 'text-sub'}`}>{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <span className={`font-mono text-xs ${c.you ? 'text-ink' : 'text-ghost'}`}>{c.rate}</span>
                      <span className={`font-mono text-xs px-2 py-0.5 rounded-md ${parseFloat(c.rgi) > 1 ? 'text-blue-400' : 'text-ghost'}`}
                        style={{ backgroundColor: parseFloat(c.rgi) > 1 ? 'rgba(59,130,246,0.12)' : 'rgba(82,82,91,0.15)' }}>
                        {c.rgi}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demand signals */}
            <div className="surface rounded-xl p-6 flex-1">
              <p className="label-upper text-sub mb-4">Upcoming Demand Events</p>
              <div className="space-y-3.5">
                {[
                  { event: 'IPL Match - Local Stadium', when: '15 Nov', lift: '+41%', type: 'Sports' },
                  { event: 'National Conference Venue', when: '18–20 Nov', lift: '+28%', type: 'Corporate' },
                  { event: 'Long Weekend Cluster', when: '22–24 Nov', lift: '+35%', type: 'Leisure' },
                  { event: 'Year-End Corporate Travel', when: 'Dec 1–20', lift: '+22%', type: 'Corporate' },
                ].map((s) => (
                  <div key={s.event} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sub text-xs font-sans">{s.event}</p>
                      <p className="text-ghost text-xs font-sans">{s.type} · {s.when}</p>
                    </div>
                    <span className="text-blue-400 text-xs font-mono font-semibold flex-shrink-0">{s.lift}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── SERVICES ─────────────────────────────────── */}
      <section ref={svc.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-24 max-w-6xl mx-auto border-t border-zinc-800 pt-24">
        <motion.div className="mb-12" initial={{ opacity: 0, y: 16 }} animate={svc.inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: ease.out }}>
          <p className="label-upper text-sub mb-3">What's Included</p>
          <h2 className="headline text-ink">Six disciplines.<br /><span className="display-serif text-blue-400">One outcome.</span></h2>
          <p className="text-sub text-sm max-w-xl mt-4 leading-relaxed">Revenue management isn't a single lever. It's six instruments played simultaneously. We conduct all of them.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              className="surface rounded-xl p-7 hover:border-zinc-600 transition-all duration-200 cursor-default group flex flex-col"
              initial={{ opacity: 0, y: 20 }}
              animate={svc.inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, ease: ease.out, delay: i * 0.07 }}
            >
              <div className="w-8 h-8 rounded-lg surface-accent flex items-center justify-center text-blue-400 text-sm mb-5">{s.icon}</div>
              <h3 className="font-sans font-semibold text-ink text-sm mb-3">{s.title}</h3>
              <p className="text-sub text-xs leading-relaxed mb-5 flex-1">{s.description}</p>
              <div className="pt-4 border-t border-zinc-800 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-blue-400 text-xs font-sans">{s.result}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PROCESS ──────────────────────────────────── */}
      <section ref={proc.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-24 max-w-4xl mx-auto">
        <motion.div className="mb-12" initial={{ opacity: 0, y: 16 }} animate={proc.inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: ease.out }}>
          <p className="label-upper text-sub mb-3">How It Works</p>
          <h2 className="headline text-ink">Audit to performance<br /><span className="display-serif text-blue-400">in three weeks.</span></h2>
        </motion.div>
        <div className="relative">
          <div className="absolute left-[19px] top-5 bottom-5 w-px bg-zinc-800" />
          <div className="space-y-9">
            {process.map((p, i) => (
              <motion.div key={p.title} className="flex gap-6"
                initial={{ opacity: 0, x: -16 }}
                animate={proc.inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, ease: ease.out, delay: i * 0.09 }}
              >
                <div className="relative z-10 w-10 h-10 rounded-full surface flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                </div>
                <div className="pt-2 pb-2">
                  <div className="flex items-center gap-3 mb-1.5">
                    <p className="font-sans font-semibold text-ink text-sm">{p.title}</p>
                    <span className="label-upper text-ghost border border-zinc-700 px-2 py-0.5 rounded-md">{p.week}</span>
                  </div>
                  <p className="text-sub text-sm leading-relaxed">{p.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section ref={cta.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-24 max-w-6xl mx-auto">
        <motion.div
          className="surface rounded-2xl p-12 md:p-16 text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={cta.inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: ease.out }}
        >
          <p className="label-upper text-blue-400 mb-5">Free, No Obligation</p>
          <h2 className="headline text-ink mb-4">See what your revenue<br /><span className="display-serif text-blue-400">could look like.</span></h2>
          <p className="text-sub text-sm max-w-lg mx-auto mb-10 leading-relaxed">
            We'll audit your current pricing strategy, OTA positioning, and competitor rates - then show you the gap and exactly what we'd do to close it. No charge, no commitment.
          </p>
          <Link href="/contact" className="glow-blue inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-sans font-semibold text-sm px-9 py-4 rounded-xl transition-all duration-200">
            Request Your Free Audit
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
