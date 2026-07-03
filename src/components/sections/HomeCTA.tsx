'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useInView } from '@/hooks/useInView'

const points = [
  { icon: '◉', heading: 'Free revenue audit', body: 'A full analysis of your pricing, OTA position, and competitor rates - delivered as a clear report.' },
  { icon: '◉', heading: 'No commitment needed', body: 'Read the audit, take the recommendations, and only engage us if it makes sense for your business.' },
  { icon: '◉', heading: 'Results in a month', body: 'Many partner hotels begin seeing measurable gains in occupancy and average room rates within just a few weeks.' },
]

export function HomeCTA() {
  const { ref, inView } = useInView(0.2)

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-32 px-6 md:px-10"
    >
      <motion.div
        className="max-w-6xl mx-auto"
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="surface rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* Left - text */}
            <div className="p-10 md:p-14 flex flex-col justify-between">
              <div>
                <p className="label-upper text-[#66B159] mb-6">Start Today - It's Free</p>
                <h2 className="headline text-ink mb-5">
                  More bookings.
                  <br />
                  <span className="text-[#66B159]">
                    Better revenue.
                  </span>
                </h2>
                <p className="text-sub text-sm leading-relaxed max-w-md mb-10">
                  The average independent hotel in India leaves 22–38% of revenue on the table through suboptimal pricing and poor OTA visibility. We find that gap, and we close it.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 bg-[#66B159] hover:bg-[#73bd66] text-[#FFFCFC] font-sans font-semibold text-sm px-6 py-3 rounded-lg transition-colors duration-200"
                  >
                    Request Free Audit
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                  <Link
                    href="/revenue"
                    className="inline-flex items-center justify-center gap-2 bg-transparent border border-[#66B159] text-ink hover:bg-[#66B159]/10 font-sans text-sm px-6 py-3 rounded-lg transition-colors duration-200 w-full sm:w-auto"
                  >
                    See Revenue Services
                  </Link>
                </div>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-10 pt-8 border-t border-zinc-800">
                {['100+ hotels onboarded', '₹40Lakhs+ revenue managed', '99.9% client retention'].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#66B159]" />
                    <span className="text-ghost text-xs font-sans">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - three points */}
            <div className="border-t lg:border-t-0 lg:border-l border-zinc-800 p-10 md:p-14 flex flex-col justify-center gap-8">
              {points.map((p, i) => (
                <motion.div
                  key={p.heading}
                  className="flex gap-4"
                  initial={{ opacity: 0, x: 16 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 + 0.18 }}
                >
                  <div className="w-9 h-9 rounded-lg surface-accent flex items-center justify-center flex-shrink-0 text-[#66B159] text-sm">
                    {p.icon}
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-ink text-sm mb-1">{p.heading}</p>
                    <p className="text-sub text-xs leading-relaxed">{p.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
