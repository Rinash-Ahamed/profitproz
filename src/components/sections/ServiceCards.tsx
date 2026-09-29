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
    snapshot: [
      { label: 'Platform reach', value: '7+ major OTAs' },
      { label: 'Account setup', value: 'Handled end to end' },
      { label: 'Post-launch', value: 'Listing checks included' },
    ],
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
    snapshot: [
      { label: 'Pricing review', value: 'Every day' },
      { label: 'Market tracking', value: '10+ competitors' },
      { label: 'Reporting', value: 'Weekly summary' },
    ],
  },
]

function ServiceCard({ service }: { service: typeof services[0] }) {
  return (
    <div className="group">
      <Link href={service.href} className="block">
        <div
          className="surface rounded-2xl p-6 md:p-8"
        >
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            {/* Left */}
            <div className="flex-1 min-w-0">
              <p className="label-upper text-[#66B159] mb-4">{service.tag}</p>
              <h2
                className="text-ink mb-4 whitespace-pre-line text-4xl md:text-5xl font-bold leading-tight tracking-tighter"
              >
                {service.title}
              </h2>
              <p className="text-sub text-sm leading-relaxed max-w-lg mb-6">{service.description}</p>

              {/* Feature list */}
              <div className="space-y-2.5 mb-6">
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
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform duration-300 group-hover:translate-x-1">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Right - measurable service snapshot */}
            <div className="grid grid-cols-1 gap-3 self-stretch sm:grid-cols-2 lg:grid-cols-1">
              {/* Metric card */}
              <div className="surface-accent rounded-xl px-5 py-5">
                <p className="label-upper text-[#66B159] mb-2">{service.metric.label}</p>
                <p className="text-ink font-sans font-bold tracking-tight leading-none text-5xl mb-1">
                  {service.metric.value}
                </p>
                <p className="text-ghost text-xs font-sans">{service.metric.sub}</p>
              </div>

              <div className="surface-raised flex h-full flex-col rounded-xl px-5 py-4">
                <p className="label-upper mb-2 text-ghost">Service snapshot</p>
                <dl className="flex flex-1 flex-col justify-center divide-y divide-zinc-700/70">
                  {service.snapshot.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4 py-3 first:pt-1 last:pb-1">
                      <dt className="text-xs font-sans text-ghost">{item.label}</dt>
                      <dd className="text-right text-xs font-sans font-medium text-ink">{item.value}</dd>
                    </div>
                  ))}
                </dl>
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
      className="pt-6 pb-16 md:pt-8 md:pb-20 px-6 md:px-10 max-w-6xl mx-auto"
    >
      {/* Section label */}
      <div className="mb-8 md:mb-10">
        <h2 className="headline text-ink">
          What We Offer? <span className="text-[#66B159]">Discover Our Services</span>
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
