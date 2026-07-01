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
      'Getting on major OTAs correctly - with proper content, right room types, proper rate parity, and a live channel sync - takes most hotels months. We do it in 3 days, and we do it right the first time.',
    href: '/onboarding',
    features: [
      'OTA Account Setup - all platforms simultaneously',
      'Professional Listing - For each platform, with photos, descriptions, and amenities',
      'Rate & Inventory Config - room types, proper pricing',
      'Channel Manager Integration - two-way sync validated',
      'Go-Live Monitoring - ensure your listing is live and correct',
    ],
    metric: { label: 'Average go-live time', value: '3 Days', sub: 'across all major OTAs' },
    dir: 1,
  },
  {
    tag: 'Revenue Management',
    title: 'Revenue\nManagement',
    description:
      'Most hotels price based on gut feeling and last year\'s rates. We replace that with a live intelligence engine - competitor tracking, demand signals, and dynamic pricing running daily so your rates are always exactly where they should be.',
    href: '/revenue',
    features: [
      'Dynamic Pricing Engine - Data-driven rates updated daily',
      'Competitor Rate Pulse - track 10+ rivals in real time',
      'Demand Forecasting - events, seasons, local patterns',
      'Yield Management - restrictions & min-stay controls',
      'Weekly Revenue Reports - clear, actionable, one page',
    ],
    metric: { label: 'Average RevPAR uplift', value: '+38%', sub: 'across our portfolio' },
    dir: -1,
  },
]

function ServiceCard({ service, i, inView }: { service: typeof services[0]; i: number; inView: boolean }) {
  return (
    <motion.div
      className="group"
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.15 }}
    >
      <Link href={service.href} className="block">
        <div
          className="surface rounded-2xl p-8 md:p-10 group-hover:border-zinc-700 transition-all duration-300 group-hover:shadow-[inset_0_0_80px_rgba(102,177,89,0.1)]"
        >
          <div className="flex flex-col lg:flex-row lg:items-start gap-10">
            {/* Left */}
            <div className="flex-1 min-w-0">
              <p className="label-upper text-[#66B159] mb-5">{service.tag}</p>
              <h2
                className="text-ink mb-5 whitespace-pre-line"
                style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.035em' }}
              >
                {service.title}
              </h2>
              <p className="text-sub text-sm leading-relaxed max-w-lg mb-8">{service.description}</p>

              {/* Feature list */}
              <div className="space-y-2.5 mb-8">
                {service.features.map((f) => {
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
                <span>Explore {service.title.replace('\n', ' ')}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform duration-300 group-hover:translate-x-1">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Right - metric + visual */}
            <div className="lg:w-60 flex flex-col gap-3 flex-shrink-0">
              {/* Metric card */}
              <div className="surface-accent rounded-xl px-5 py-5">
                <p className="label-upper text-[#66B159] mb-2">{service.metric.label}</p>
                <p className="text-ink font-sans font-bold tracking-tight mb-1" style={{ fontSize: '2.5rem', lineHeight: 1 }}>
                  {service.metric.value}
                </p>
                <p className="text-ghost text-xs font-sans">{service.metric.sub}</p>
              </div>

              {/* Hotel image visual */}
              <div className="surface rounded-xl overflow-hidden">
                <Image src={i === 0 ? '/images/service-revenue-visual.jpg' : '/images/service-onboarding-visual.jpg'} alt={i === 0 ? 'Premium hotel room and revenue-driven experience' : 'Hotel reception and guest journey'} width={900} height={600} className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="px-5 py-4">
                  <p className="label-upper text-ghost mb-2">Visual positioning</p>
                  <p className="text-sub text-xs leading-relaxed">Stronger listing presentation and pricing clarity create a more bookings.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export function ServiceCards() {
  const { ref, inView } = useInView(0.08)

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-32 px-6 md:px-10 max-w-6xl mx-auto"
    >
      {/* Section label */}
      <motion.div
        className="mb-16"
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: ease.out }}
      >
        <h2 className="headline text-ink">
          What Do We Offer? <span className="text-[#66B159]">Discover Our Services</span>
        </h2>
      </motion.div>

      <div className="flex flex-col gap-4">
        {services.map((s, i) => (
          <ServiceCard key={s.tag} service={s} i={i} inView={inView} />
        ))}
      </div>
    </section>
  )
}
