'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { useInView } from '@/hooks/useInView'
import { ease } from '@/lib/utils'

const pillars = [
  {
    title: 'Revenue-first strategy',
    body: 'We design every engagement around the economics of the property: ADR, occupancy, RevPAR, and channel profitability.',
  },
  {
    title: 'Hands-on execution',
    body: 'From pricing logic to OTA setup and daily optimisation, we do the work rather than just handing over a playbook.',
  },
  {
    title: 'Clarity over noise',
    body: 'Every decision is supported by a clear explanation, measurable outcome, and a practical next step.',
  },
]

export default function AboutPage() {
  const hero = useInView(0.1)
  const story = useInView(0.1)

  return (
    <div className="min-h-screen bg-zinc-1000">
      <Nav />

      <section ref={hero.ref as React.RefObject<HTMLElement>} className="relative pt-32 pb-16 px-6 md:px-10 max-w-6xl mx-auto overflow-hidden">
        {/* Subtle animated background */}
        <motion.div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(102, 177, 89, 0.1), transparent),
                            radial-gradient(ellipse 50% 40% at 20% 110%, rgba(102, 177, 89, 0.08), transparent),
                            radial-gradient(ellipse 50% 40% at 80% 100%, rgba(102, 177, 89, 0.08), transparent)`,
            backgroundRepeat: 'no-repeat',
          }}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={hero.inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1.2, ease: ease.out }}
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={hero.inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: ease.out }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-2 rounded-full bg-[#66B159] pulse-dot" />
            <span className="label-upper text-sub">About ProfitPro</span>
          </div>
          <h1 className="display-xl text-ink mb-4 max-w-3xl">We help hotels turn visibility into measurable revenue.</h1>
          <p className="text-sub text-lg md:text-xl max-w-2xl leading-relaxed">
            ProfitPro is a revenue and distribution partner for independent hotels that want sharper pricing, stronger OTA presence, and less operational complexity.
          </p>
        </motion.div>
      </section>

      <section ref={story.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-24 max-w-6xl mx-auto">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8"
          initial={{ opacity: 0, y: 24 }}
          animate={story.inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: ease.out, delay: 0.1 }}
        >
          <div className="surface rounded-2xl p-8 md:p-10">
            <p className="label-upper text-[#66B159] mb-4">Why we exist</p>
            <h2 className="headline text-ink mb-4">Most hotels are not short on potential. They are short on structure.</h2>
            <p className="text-sub text-sm leading-relaxed">
              We work with hotels that are doing good business but leaving money on the table through inconsistent pricing, weak OTA positioning, or manual distribution processes. ProfitPro brings a focused system to those gaps so the property can grow without adding internal complexity.
            </p>
          </div>

          <div className="space-y-4">
            {pillars.map((item) => (
              <div key={item.title} className="surface rounded-2xl p-6">
                <h3 className="font-sans font-semibold text-ink text-sm mb-2">{item.title}</h3>
                <p className="text-sub text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="mt-8 surface rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          initial={{ opacity: 0, y: 24 }}
          animate={story.inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: ease.out, delay: 0.2 }}
        >
          <div>
            <p className="label-upper text-sub mb-3">Ready to see what’s possible?</p>
            <h3 className="headline text-ink">Let’s map your next revenue gain.</h3>
          </div>
          <Link href="/contact" className="glow-green inline-flex items-center gap-2 bg-[#66B159] hover:bg-[#73bd66] text-[#FFFCFC] font-sans font-semibold text-sm px-6 py-3 rounded-lg transition-all duration-200">
            Book a Free Audit
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
