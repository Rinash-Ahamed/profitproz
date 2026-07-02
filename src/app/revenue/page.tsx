'use client'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { useInView } from '@/hooks/useInView'
import { useCounter } from '@/hooks/useCounter'
import { formatNumber } from '@/lib/utils'
import Link from 'next/link'

/* ── Services ───────────────────────────────────────── */
const services = [
  {
    title: 'Dynamic Pricing Engine',
    description: 'Rates are recommended daily based on real-time demand signals, your competitor set, local events, and your own historical patterns. No more static pricing that leaves money on the table during peak periods or kills occupancy in soft ones.',
    result: 'Hotels see ADR improvement of 20–40% within 60 days.',
  },
  {
    title: 'Competitor Rate Intelligence',
    description: 'We track your competitive set across every OTA every single day - rate levels, availability, promotions, and positioning. When a rival drops rates aggressively or a new property enters your market, you\'ll know and we\'ll respond.',
    result: '360° competitive visibility updated daily.',
  },
  {
    title: 'Demand Forecasting',
    description: 'Corporate booking windows, leisure demand patterns, local events, public holidays, and macro travel trends - all built into a demand calendar that tells us when to be aggressive on rate and when to prioritise fill.',
    result: 'Occupancy gaps reduced by 60% on average.',
  },
  {
    title: 'Yield Management',
    description: 'Minimum length of stay controls, close-out dates, non-refundable rate fencing, and channel allocation decisions - all configured to maximise revenue contribution per available room, not just fill rates.',
    result: 'RevPAR indexed above market average for 94% of clients.',
  },
  {
    title: 'OTA Ranking Optimisation',
    description: 'Search ranking on Booking.com and MakeMyTrip is driven by content quality, review score, response rate, and pricing competitiveness. We manage all four simultaneously so your property appears higher in more searches.',
    result: 'Average 35% improvement in OTA page rank.',
  },
  {
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

function KPI({ pre, n, suf, label, active }: { pre: string; n: number; suf: string; label: string; active: boolean }) {
  const v = useCounter(n, 2.2, active)
  return (
    <div className="surface-accent rounded-xl p-6">
      <p className="label-upper text-sub mb-3">{label}</p>
      <p className="font-sans font-bold text-ink tracking-tight" style={{ fontSize: '2.6rem', lineHeight: 1 }}>
        <span className="text-[#66B159]">{pre}</span>{formatNumber(v)}<span className="text-[#66B159]">{suf}</span>
      </p>
    </div>
  )
}

export default function RevenuePage() {
  const kpi   = useInView(0.2)

  return (
    <div className="min-h-screen bg-zinc-1000">
      <Nav />

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 px-6 md:px-10 max-w-6xl mx-auto overflow-hidden">
        {/* Subtle animated background */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(102, 177, 89, 0.1), transparent),
                            radial-gradient(ellipse 50% 40% at 20% 110%, rgba(102, 177, 89, 0.08), transparent),
                            radial-gradient(ellipse 50% 40% at 80% 100%, rgba(102, 177, 89, 0.08), transparent)`,
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-2 rounded-full bg-[#66B159] pulse-dot" />
            <span className="label-upper text-sub">Revenue Management</span>
          </div>
          <h1 className="headline text-ink mb-7">
            Every Night <span className="text-[#66B159]">Maximum revenue.</span>
          </h1>
          <p className="text-sub text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
            Most hotels price based on intuition and what worked last year. We replace that with a data-driven revenue engine - competitor rates tracked daily, demand signals captured in advance, and pricing adjusted to maximise what you earn every single night.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="inline-flex items-center gap-2 bg-[#66B159] hover:bg-[#73bd66] text-[#FFFCFC] font-sans font-semibold text-sm px-6 py-3 rounded-lg transition-colors duration-200">
              Get a Free Revenue Audit
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link href="/onboarding" className="inline-flex items-center justify-center bg-transparent border border-[#66B159] text-ink hover:bg-[#66B159]/10 font-sans text-sm px-6 py-3 rounded-lg transition-colors duration-200">
              Also need OTA setup ?
            </Link>
          </div>
        </div>
      </section>

      {/* ── KPIs ─────────────────────────────────────── */}
      <section ref={kpi.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPI pre="+" n={38} suf="%" label="Average RevPAR uplift" active={kpi.inView} />
          <KPI pre="+" n={24} suf="%" label="Average ADR growth" active={kpi.inView} />
          <KPI pre="+" n={18} suf=" pts" label="Average occupancy gain" active={kpi.inView} />
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────── */}
      <section className="px-6 md:px-10 pb-24 max-w-6xl mx-auto border-t border-zinc-800 pt-24">
        <div className="mb-12">
          <p className="label-upper text-sub mb-3">What's Included</p>
          <h2 className="headline text-ink">Six disciplines <span className="text-[#66B159]">One Outcome</span></h2>
          <p className="text-sub text-sm max-w-xl mt-4 leading-relaxed">Revenue management isn't a single lever. It's six instruments played simultaneously. We conduct all of them.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div
              key={s.title}
              className="surface rounded-xl p-7 cursor-default group flex flex-col"
            >
              <h3 className="font-sans font-semibold text-ink text-sm mb-3">{s.title}</h3>
              <p className="text-sub text-xs leading-relaxed mb-5 flex-1">{s.description}</p>
              <div className="pt-4 border-t border-zinc-800 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-[#66B159] flex-shrink-0" />
                <span className="text-[#66B159] text-xs font-sans">{s.result}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROCESS ──────────────────────────────────── */}
      <section className="px-6 md:px-10 pb-24 max-w-4xl mx-auto">
        <div className="mb-12">
          <p className="label-upper text-sub mb-3">How It Works</p>
          <h2 className="headline text-ink">Audit to performance in <span className="text-[#66B159]">three weeks.</span></h2>
        </div>
        <div className="relative">
          <div className="absolute left-[19px] top-5 bottom-5 w-px bg-zinc-800" />
          <div className="space-y-9">
            {process.map((p) => (
              <div key={p.title} className="flex gap-6">
                <div className="relative z-10 w-10 h-10 rounded-full surface flex items-center justify-center flex-shrink-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-[#66B159]"
                  />
                </div>
                <div className="pt-2 pb-2">
                  <div className="flex items-center gap-3 mb-1.5">
                    <p className="font-sans font-semibold text-ink text-sm">{p.title}</p>
                    <span className="label-upper text-ghost border border-zinc-700 px-2 py-0.5 rounded-md">{p.week}</span>
                  </div>
                  <p className="text-sub text-sm leading-relaxed">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="px-6 md:px-10 pb-24 max-w-6xl mx-auto">
        <div
          className="surface rounded-2xl p-12 md:p-16 text-center"
        >
          <p className="label-upper text-[#66B159] mb-5">Free, No Obligation</p>
          <h2 className="headline text-ink mb-4">See what your revenue <span className="text-[#66B159]">could look like.</span></h2>
          <p className="text-sub text-sm max-w-lg mx-auto mb-10 leading-relaxed">
            We'll audit your current pricing strategy, OTA positioning, and competitor rates - then show you the gap and exactly what we'd do to close it.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-[#66B159] hover:bg-[#73bd66] text-[#FFFCFC] font-sans font-semibold text-sm px-9 py-4 rounded-xl transition-colors duration-200">
            Request Your Free Audit
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
