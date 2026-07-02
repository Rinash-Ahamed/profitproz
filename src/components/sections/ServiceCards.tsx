'use client'
import Image from 'next/image'
import Link from 'next/link'

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
    image: '/service-onboarding.svg',
    imageAlt: 'Hotel onboarding dashboard preview',
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
    image: '/service-revenue-v2.svg',
    imageAlt: 'Revenue management dashboard preview',
    dir: -1,
  },
]

function ServiceCard({ service }: { service: typeof services[0] }) {
  return (
    <div className="group">
      <Link href={service.href} className="block">
        <div
          className="surface rounded-2xl p-8 md:p-10"
        >
          <div className="flex flex-col lg:flex-row lg:items-start gap-10">
            {/* Left */}
            <div className="flex-1 min-w-0">
              <p className="label-upper text-[#66B159] mb-5">{service.tag}</p>
              <h2
                className="text-ink mb-5 whitespace-pre-line text-4xl md:text-5xl font-bold leading-tight tracking-tighter"
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
              <div className="inline-flex items-center gap-2 text-[#66B159] text-sm font-sans font-medium">
                <span>Explore {service.title.replace('\n', ' ')}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Right - metric + visual */}
            <div className="lg:w-60 flex flex-col gap-3 flex-shrink-0">
              {/* Metric card */}
              <div className="surface-accent rounded-xl px-5 py-5">
                <p className="label-upper text-[#66B159] mb-2">{service.metric.label}</p>
                <p className="text-ink font-sans font-bold tracking-tight leading-none text-5xl mb-1">
                  {service.metric.value}
                </p>
                <p className="text-ghost text-xs font-sans">{service.metric.sub}</p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
                <Image
                  src={service.image}
                  alt={service.imageAlt}
                  width={320}
                  height={640}
                  className="h-auto w-full rounded-xl object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

export function ServiceCards() {
  return (
    <section
      className="pt-8 pb-20 md:pt-10 md:pb-24 px-6 md:px-10 max-w-6xl mx-auto"
    >
      {/* Section label */}
      <div className="mb-10 md:mb-12">
        <h2 className="headline text-ink">
          What Do We Offer? <span className="text-[#66B159]">Discover Our Services</span>
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        {services.map((s) => (
          <ServiceCard key={s.tag} service={s} />
        ))}
      </div>
    </section>
  )
}
