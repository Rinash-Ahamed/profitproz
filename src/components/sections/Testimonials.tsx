'use client'
import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useInView } from '@/hooks/useInView'
import { ease } from '@/lib/utils'
import { AnimatedSection } from '@/components/animations/AnimatedSection'

const testimonials = [
  {
    quote: 'ProfitPro increased our RevPAR by 43% within the first quarter. What impressed us most was the proactive communication - they flagged a competitor rate drop before we even noticed it and adjusted our strategy overnight.',
    author: 'Rajesh Menon',
    role: 'General Manager',
    hotel: 'The Orchid Hotel, Mumbai',
    metric: '+43% RevPAR'
  },
  {
    quote: 'We were on just two OTAs before ProfitPro. Within 7 days we were live on all seven, fully optimised with professional copy and photos properly sequenced. Bookings came in on day one. I wish we had done this two years ago.',
    author: 'Priya Nambiar',
    role: 'Owner',
    hotel: 'Spice Garden Boutique Resort, Wayanad',
    metric: '7 OTAs · 7 days'
  },
  {
    quote: 'The weekly reports are exactly what a busy hotel owner needs - one page, clear numbers, what changed and why. I stopped logging into the OTA extranets entirely. The team just handles it.',
    author: 'Aditya Singhania',
    role: 'Director of Operations',
    hotel: 'Heritage Haveli, Jaipur',
    metric: '+29% Occupancy'
  },
  {
    quote: 'Our ADR went from ₹4,200 to ₹5,800 in five months without any drop in occupancy. The dynamic pricing engine is smart - it captures corporate demand on weekdays and leisure premium on weekends automatically.',
    author: 'Kavitha Krishnamurthy',
    role: 'Co-Founder',
    hotel: 'The Canopy Stays, Coorg',
    metric: '+38% ADR'
  },
]

export function Testimonials() {
  const { ref, inView } = useInView(0.1)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [carouselWidth, setCarouselWidth] = useState(0)

  useEffect(() => {
    const calculateWidth = () => {
      if (carouselRef.current) {
        setCarouselWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth)
      }
    }
    calculateWidth()
    window.addEventListener('resize', calculateWidth)
    return () => window.removeEventListener('resize', calculateWidth)
  }, [inView]) // Recalculate when it comes into view

  return (
    <section
      id="testimonials"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-32 px-6 md:px-10 border-t border-zinc-800"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <AnimatedSection className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14" y={16} amount={0.1}>
          <div>
            <h2 className="headline text-ink">
              Heard directly from <span className="text-[#66B159]">hotel owners.</span>
            </h2>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 py-3 w-fit shadow-[0_16px_50px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="13" height="13" viewBox="0 0 13 13" fill="#66B159">
                  <path d="M6.5 1l1.5 3.1L11.5 4.6l-2.5 2.4.6 3.4L6.5 9l-3.1 1.4.6-3.4-2.5-2.4 3.5-.5L6.5 1z"/>
                </svg>
              ))}
            </div>
            <span className="text-ink text-sm font-sans font-semibold">4.9</span>
            <span className="text-sub text-xs font-sans">from 200+ reviews</span>
          </div>
        </AnimatedSection>

        {/* Horizontal Carousel */}
        <motion.div
          ref={carouselRef}
          className="cursor-grab overflow-hidden"
          whileTap={{ cursor: 'grabbing' }}
        >
          <motion.div
            className="flex gap-4"
            drag="x"
            dragConstraints={{ right: 0, left: -carouselWidth }}
            transition={{ duration: 0.8, ease: ease.out }}
          >
            {testimonials.map((t, i) => (
              <motion.div
                key={t.author}
                className="min-w-[90vw] sm:min-w-[450px] rounded-2xl border border-zinc-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-7 flex flex-col justify-between shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
                initial={{ opacity: 0, y: 22, scale: 0.98 }}
                animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
              >
                {/* Metric badge */}
                <div className="flex items-center justify-between mb-5">
                  <div
                    className="px-3 py-1 rounded-md text-xs font-sans font-semibold"
                    style={{ backgroundColor: 'rgba(102, 177, 89, 0.12)', color: '#66B159' }}
                  >
                    {t.metric}
                  </div>
                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} width="11" height="11" viewBox="0 0 11 11" fill="#66B159" opacity="0.7">
                        <path d="M5.5 1l1.2 2.6L9.5 3.9l-2 1.95.47 2.75L5.5 7.4 3.03 8.6l.47-2.75L1.5 3.9l2.8-.3L5.5 1z"/>
                      </svg>
                    ))}
                  </div>
                </div>

                {/* Quote */}
                <p className="text-sub text-sm leading-relaxed mb-6 flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-5 border-t border-zinc-800/80">
                  {/* Avatar placeholder - initials */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-sans font-bold text-xs"
                    style={{ backgroundColor: 'rgba(102, 177, 89, 0.15)', color: '#66B159' }}
                  >
                    {t.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-ink text-sm">{t.author}</p>
                    <p className="text-ghost text-xs font-sans">{t.role} · {t.hotel}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.p
          className="text-ghost text-xs font-sans mt-8 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Drag to explore more testimonials
        </motion.p>
      </div>
    </section>
  )
}
