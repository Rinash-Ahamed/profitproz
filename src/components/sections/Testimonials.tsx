'use client'
import { useRef, useState, useEffect } from 'react'
import { motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { useVisibleActivity } from '@/hooks/useVisibleActivity'
import { ease } from '@/lib/utils'

type TestimonialCard = {
  author: string
  hotel: string
  role?: string
  quote?: string
  description?: string
  metric?: string
}

const testimonials: TestimonialCard[] = [
  {
    quote: 'ProfitPro increased our RevPAR by 43% within the first quarter. What impressed us most was the proactive communication - they flagged a competitor rate drop before we even noticed it and adjusted our strategy overnight.',
    author: 'Liyakath Ali',
    role: 'Proprietor',
    hotel: 'Ambience Retreat, Karnataka',
    metric: '+43% RevPAR'
  },
  {
    quote: 'We were on just two OTAs before ProfitPro. Within 3 days we were live on all seven, fully optimised with professional copy and photos properly sequenced. Bookings came in on day one. I wish we had done this two years ago.',
    author: 'TamilArasi',
    role: 'Owner',
    hotel: 'Thekkady Arasi Hotel, Kerala',
    metric: '7 OTAs · 3 days'
  },
  {
    quote: 'The weekly reports are exactly what a busy hotel owner needs - one page, clear numbers, what changed and why. I stopped logging into the OTA extranets entirely. The team just handles it.',
    author: 'Adhilinga Perumal',
    role: 'Property Owner',
    hotel: 'ELMS Hotels, Kerala',
    metric: '+29% Occupancy'
  },
  {
    quote: 'Our ADR went from ₹1,200 to ₹3,500 in three months without any drop in occupancy. The dynamic pricing engine is smart - it captures corporate demand on weekdays and leisure premium on weekends automatically.',
    author: 'Gokul',
    role: 'Manager',
    hotel: 'Hotel Nachas, Coimbatore',
    metric: '+38% ADR'
  },
  {
    author: 'Santhosh Kumar',
    hotel: 'SPR Hotels Inn',
    description: 'Meet SPR Hotels Inn, part of the ProfitPro client community, with Santhosh Kumar as the client contact.',
  },
  {
    author: 'Nisar',
    hotel: 'Aradhya Residency',
    description: 'Introducing Aradhya Residency, a ProfitPro client represented by Nisar. Every property brings its own identity to our hospitality community.',
  },
]

export function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null)
  const active = useVisibleActivity(sectionRef)
  const reduceMotion = useReducedMotion()
  const carouselRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const [carouselWidth, setCarouselWidth] = useState(0)

  useEffect(() => {
    const viewport = carouselRef.current
    const track = trackRef.current
    if (!viewport || !track) return

    const calculateWidth = () => {
      // Measure the untransformed track, not overflow affected by its drag position.
      const width = Math.max(0, track.scrollWidth - viewport.clientWidth)
      setCarouselWidth(width)
      const position = x.get()
      const clampedPosition = Math.max(-width, Math.min(0, position))
      if (position !== clampedPosition) {
        x.stop()
        x.set(clampedPosition)
      }
    }

    calculateWidth()
    const observer = new ResizeObserver(calculateWidth)
    observer.observe(viewport)
    observer.observe(track)
    return () => observer.disconnect()
  }, [x])

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="pt-14 pb-12 md:pt-16 md:pb-14 px-6 md:px-10 border-t border-zinc-800"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-10">
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
            <span className="text-ink text-sm font-sans font-semibold">4.8</span>
            <span className="text-sub text-xs font-sans">from 80+ reviews</span>
          </div>
        </div>

        {/* Horizontal Carousel */}
        <motion.div
          ref={carouselRef}
          className="cursor-grab overflow-hidden"
          whileTap={{ cursor: 'grabbing' }}
        >
          <motion.div
            ref={trackRef}
            className="flex w-max select-none gap-4"
            style={{ x, touchAction: 'pan-y' }}
            drag="x"
            dragConstraints={{ right: 0, left: -carouselWidth }}
            transition={{ duration: 0.8, ease: ease.out }}
          >
            {testimonials.map((t) => (
              <div
                key={t.author}
                className="w-[90vw] shrink-0 sm:w-[450px] rounded-2xl border border-zinc-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-7 flex flex-col justify-between shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
              >
                {/* Metric badge */}
                <div className="flex items-center justify-between mb-5">
                  <div
                    className="px-3 py-1 rounded-md text-xs font-sans font-semibold"
                    style={{ backgroundColor: 'rgba(102, 177, 89, 0.12)', color: '#66B159' }}
                  >
                    {t.metric || 'Client spotlight'}
                  </div>
                  {/* Stars */}
                  {t.quote ? <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} width="11" height="11" viewBox="0 0 11 11" fill="#66B159" opacity="0.7">
                        <path d="M5.5 1l1.2 2.6L9.5 3.9l-2 1.95.47 2.75L5.5 7.4 3.03 8.6l.47-2.75L1.5 3.9l2.8-.3L5.5 1z"/>
                      </svg>
                    ))}
                  </div> : null}
                </div>

                {/* Quote */}
                <div className="mb-6 flex-1">
                  {t.quote ? <p className="text-sub text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p> : <>
                    <p className="mb-3 font-sans text-lg font-semibold text-ink">{t.hotel}</p>
                    <p className="text-sub text-sm leading-relaxed">{t.description}</p>
                  </>}
                </div>

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
                    <p className="text-ghost text-xs font-sans">{t.role ? `${t.role} · ` : ''}{t.hotel}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.p
          className="text-ghost text-xs font-sans mt-6 flex items-center gap-2"
          animate={{ x: active && !reduceMotion ? [0, -4, 0] : 0 }}
          transition={active && !reduceMotion ? { duration: 1.5, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' } : { duration: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M12 7H2m4 4l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Drag to explore more testimonials
        </motion.p>
      </div>
    </section>
  )
}
