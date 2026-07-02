'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from '@/hooks/useInView'
import { ease } from '@/lib/utils'

const faqs = [
  {
    q: 'How quickly can you start managing our revenue?',
    a: 'We can audit your property and deploy a pricing strategy within 5–7 business days. Most hotels see measurable rate improvement within the first two weeks.',
  },
  {
    q: 'Do we need a channel manager already?',
    a: 'No. If you don\'t have one, we recommend and set up the right channel manager for your property size as part of the onboarding process.',
  },
  {
    q: 'What OTAs do you cover in onboarding?',
    a: 'MakeMyTrip, Booking.com, Agoda, Yatra, Expedia, Goibibo, and Airbnb - all seven, simultaneously, within 7 days.',
  },
  {
    q: 'How is your pricing structured?',
    a: 'We work on a monthly retainer based on property size and service scope. The free audit gives you a clear picture before you commit to anything.',
  },
  {
    q: 'Do you work with independent hotels or only chains?',
    a: 'Mostly independent hotels and small to mid-size properties across India - boutique hotels, business hotels, resorts, and homestays. That\'s our speciality.',
  },
  {
    q: 'What does the free revenue audit include?',
    a: 'A full review of your current pricing strategy, OTA positioning, competitor rates, and occupancy patterns - delivered as a clear report with specific recommendations.',
  },
]

function FAQItem({ item, i }: { item: typeof faqs[0]; i: number }) {
  const [open, setOpen] = useState(i === 0)

  return (
    <div className="border-b border-zinc-800">
      <button
        className="w-full flex items-center justify-between py-5 text-left group"
        onClick={() => setOpen(!open)}
      >
        <span className="font-sans font-medium text-ink text-sm pr-4 group-hover:text-[#66B159] transition-colors duration-200">
          {item.q}
        </span>
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25, ease: ease.out }}
          className="flex-shrink-0 w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 2v6M2 5h6" stroke={open ? '#66B159' : '#71717A'} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: ease.out }}
            className="overflow-hidden"
          >
            <p className="text-sub text-sm leading-relaxed pb-5">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FAQ() {
  const { ref, inView } = useInView(0.15)

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-24 max-w-3xl mx-auto">
      <motion.div className="mb-10" initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: ease.out }}>
        <p className="label-upper text-sub mb-3">FAQ</p>
        <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight leading-tight">Questions we hear often</h2>
      </motion.div>
      <div>
        {faqs.map((f, i) => (
          <FAQItem key={f.q} item={f} i={i} />
        ))}
      </div>
    </section>
  )
}