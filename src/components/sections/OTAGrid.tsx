'use client'
import { motion } from 'framer-motion'
import { useInView } from '@/hooks/useInView'
import { ease } from '@/lib/utils'
import { AnimatedSection } from '@/components/animations/AnimatedSection'

const platforms = [
  { name: 'MakeMyTrip', mark: 'MM', reach: '50M+ users', tag: 'India #1', sub: 'Domestic leisure dominant', dot: '#E53E3E', accent: 'bg-rose-500/15 text-rose-300' },
  { name: 'Booking.com', mark: 'Bk', reach: '150M+ users', tag: 'Global leader', sub: 'Widest international reach', dot: '#2B6CB0', accent: 'bg-sky-500/15 text-sky-300' },
  { name: 'Agoda', mark: 'Ag', reach: '35M+ users', tag: 'APAC dominant', sub: 'Asia-Pacific & corporate', dot: '#E53E3E', accent: 'bg-rose-500/15 text-rose-300' },
  { name: 'Yatra', mark: 'Yt', reach: '15M+ users', tag: 'Tier 2 India', sub: 'Domestic business travel', dot: '#DD6B20', accent: 'bg-orange-500/15 text-orange-300' },
  { name: 'Expedia', mark: 'Ex', reach: '70M+ users', tag: 'US & Europe', sub: 'Includes Hotels.com', dot: '#D69E2E', accent: 'bg-amber-500/15 text-amber-300' },
  { name: 'Goibibo', mark: 'Gi', reach: '25M+ users', tag: 'Youth travel', sub: 'Millennial & Gen-Z India', dot: '#2B6CB0', accent: 'bg-sky-500/15 text-sky-300' },
  { name: 'Airbnb', mark: 'Ab', reach: '40M+ users', tag: 'Boutique stays', sub: 'High ADR, low commission', dot: '#E53E3E', accent: 'bg-rose-500/15 text-rose-300' },
]

export function OTAGrid() {
  const { ref, inView } = useInView(0.1)

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-24 md:py-32 px-6 md:px-10 border-t border-zinc-800">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <AnimatedSection className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14" y={16} amount={0.1}>
          <div>
            <p className="label-upper text-sub mb-3">Distribution Network</p>
            <h2 className="headline text-ink">
              One partner.
              <br />
              <span className="display-serif text-[#66B159]">Seven platforms.</span>
            </h2>
          </div>
          <p className="text-sub text-sm max-w-sm leading-relaxed">
            We set up, optimise, and manage your presence across every major booking platform - with listings tailored to each platform's algorithm, not one copy pasted seven times.
          </p>
        </AnimatedSection>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {platforms.map((p, i) => (
            <motion.div
              key={p.name}
              className="surface rounded-xl p-5 hover:border-zinc-600 transition-all duration-200 cursor-default group"
              whileHover={{ y: -4, scale: 1.01, boxShadow: '0 10px 30px rgba(102, 177, 89, 0.08)' }}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-sans font-semibold text-[0.65rem] tracking-[0.2em] uppercase"
                  style={{ backgroundColor: p.dot + '18', border: `1px solid ${p.dot}28`, color: p.dot }}>
                  {p.mark}
                </div>
                <span className={`label-upper rounded-full px-2.5 py-1 ${p.accent}`}>{p.tag}</span>
              </div>
              <p className="font-sans font-semibold text-ink text-sm mb-0.5">{p.name}</p>
              <p className="text-ghost text-xs font-sans mb-2">{p.sub}</p>
              <p className="text-sub text-xs font-sans">{p.reach}</p>
              <div className="mt-4 h-px bg-zinc-800 group-hover:bg-[#66B159]/30 transition-colors duration-300" />
            </motion.div>
          ))}

          {/* More coming card */}
          <motion.div
            className="surface rounded-xl p-5 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.44 }}
          >
            <div className="w-9 h-9 rounded-lg surface-accent flex items-center justify-center mb-3">
              <span className="text-[#66B159] text-lg">+</span>
            </div>
            <p className="label-upper text-ghost">More platforms<br />being added</p>
          </motion.div>
        </div>

        {/* Bottom note */}
        <motion.p
          className="text-ghost text-xs font-sans text-center mt-8"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          All platforms set up simultaneously. Rate parity monitored from day one. No manual switching between extranets.
        </motion.p>
      </div>
    </section>
  )
}
