'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useInView } from '@/hooks/useInView'
import { ease } from '@/lib/utils'

const services = [
  {
    tag: 'Hotel Onboarding',
    title: 'Hotel\nOnboarding',
    description:
      'Getting on 7 OTAs correctly - with SEO-optimised content, right room types, proper rate parity, and a live channel sync - takes most hotels months. We do it in 7 days, and we do it right the first time.',
    href: '/onboarding',
    features: [
      'OTA Account Setup - all 7 platforms simultaneously',
      'Professional Listing Copy - platform-specific SEO',
      'Rate & Inventory Config - room types, restrictions',
      'Channel Manager Integration - two-way sync validated',
      'Go-Live Monitoring - first bookings watched live',
    ],
    metric: { label: 'Average go-live time', value: '7 Days', sub: 'across all 7 OTAs' },
    dir: 1,
  },
  {
    tag: 'Revenue Management',
    title: 'Revenue\nManagement',
    description:
      'Most hotels price based on gut feeling and last year\'s rates. We replace that with a live intelligence engine - competitor tracking, demand signals, and dynamic pricing running daily so your rates are always exactly where they should be.',
    href: '/revenue',
    features: [
      'Dynamic Pricing Engine - AI-driven rates updated daily',
      'Competitor Rate Pulse - track 10+ rivals in real time',
      'Demand Forecasting - events, seasons, local patterns',
      'Yield Management - restrictions & min-stay controls',
      'Weekly Revenue Reports - clear, actionable, one page',
    ],
    metric: { label: 'Average RevPAR uplift', value: '+38%', sub: 'across our portfolio' },
    dir: -1,
  },
]

export function ServiceCards() {
  const { ref, inView } = useInView(0.08)

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-32 px-6 md:px-10 max-w-6xl mx-auto"
    >
      {/* Section label */}
      <motion.div
        className="flex items-center gap-4 mb-16"
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: ease.out }}
      >
        <span className="label-upper text-sub">What We Do</span>
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="label-upper text-ghost">Two services, one mission</span>
      </motion.div>

      <div className="flex flex-col gap-4">
        {services.map((s, i) => (
          <motion.div
            key={s.tag}
            initial={{ opacity: 0, x: s.dir * 36, y: 16, willChange: 'transform, opacity' }}
            animate={inView ? { opacity: 1, x: 0, y: 0, willChange: 'auto' } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.12 }}
          >
            <Link href={s.href} className="block group">
              <div className="surface rounded-2xl p-8 md:p-10 hover:border-zinc-600 transition-all duration-300 group-hover:shadow-[0_0_40px_rgba(102,177,89,0.08)] group-hover:-translate-y-1">
                <div className="flex flex-col lg:flex-row lg:items-start gap-10">

                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <p className="label-upper text-[#66B159] mb-5">{s.tag}</p>
                    <h2
                      className="text-ink mb-5 whitespace-pre-line"
                      style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.035em' }}
                    >
                      {s.title}
                    </h2>
                    <p className="text-sub text-sm leading-relaxed max-w-lg mb-8">{s.description}</p>

                    {/* Feature list */}
                    <div className="space-y-2.5 mb-8">
                      {s.features.map((f) => {
                        const [bold, rest] = f.split(' - ')
                        return (
                          <div key={f} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#66B159] flex-shrink-0 mt-1.5" />
                            <span className="text-sm font-sans">
                              <span className="text-ink font-medium">{bold}</span>
                              {rest && <span className="text-ghost"> - {rest}</span>}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Arrow CTA */}
                    <div className="inline-flex items-center gap-2 text-[#66B159] text-sm font-sans font-medium group-hover:gap-3 transition-all duration-300">
                      <span>Explore {s.title.replace('\n', ' ')}</span>
                      <motion.svg
                        width="14" height="14" viewBox="0 0 14 14" fill="none"
                        animate={{ x: 0 }}
                        whileHover={{ x: 3 }}
                      >
                        <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </motion.svg>
                    </div>
                  </div>

                  {/* Right - metric + visual */}
                  <div className="lg:w-60 flex flex-col gap-3 flex-shrink-0">
                    {/* Metric card */}
                    <div className="surface-accent rounded-xl px-5 py-5">
                      <p className="label-upper text-[#66B159] mb-2">{s.metric.label}</p>
                      <p
                        className="text-ink font-sans font-bold tracking-tight mb-1"
                        style={{ fontSize: '2.5rem', lineHeight: 1 }}
                      >
                        {s.metric.value}
                      </p>
                      <p className="text-ghost text-xs font-sans">{s.metric.sub}</p>
                    </div>

                    {/* Hotel image visual */}
                    <motion.div
                      className="surface rounded-xl overflow-hidden"
                      whileHover={{ scale: 1.02, y: -3, filter: 'brightness(1.03)' }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Image
                        src={i === 0
                          ? 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80'
                          : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80'}
                        alt={i === 0 ? 'Premium hotel room and revenue-driven experience' : 'Hotel reception and guest journey'}
                        width={900}
                        height={600}
                        className="h-36 w-full object-cover"
                      />
                      <div className="px-5 py-4">
                        <p className="label-upper text-ghost mb-2">Visual positioning</p>
                        <p className="text-sub text-xs leading-relaxed">
                          Stronger listing presentation and pricing clarity create a more compelling stay experience.
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
