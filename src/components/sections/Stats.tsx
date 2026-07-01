'use client'
import { motion } from 'framer-motion'
import { useInView } from '@/hooks/useInView'
import { useCounter } from '@/hooks/useCounter'
import { ease } from '@/lib/utils'

const data = [
  { pre: '', value: 10, suf: '+', label: 'Hotels Managed' },
  { pre: '+', value: 38, suf: '%', label: 'Avg RevPAR Uplift' },
  { pre: '', value: 7, suf: '', label: 'OTA Platforms' },
  { pre: '₹', value: 40, suf: 'L+', label: 'Revenue Managed' },
  { pre: '', value: 99.0, suf: '%', label: 'Client Retention' },
]

function Stat({ item, active, i }: { item: typeof data[0]; active: boolean; i: number }) {
  const n = useCounter(item.value, 2.2, active)
  return (
    <motion.div
      className="flex flex-col items-center text-center py-8 px-4 relative"
      initial={{ opacity: 0, y: 18, scale: 0.98, willChange: 'transform, opacity' }}
      animate={active ? { opacity: 1, y: 0, scale: 1, willChange: 'auto' } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
    >
      {i < data.length - 1 && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-10 bg-zinc-800" />
      )}
      <div className="font-sans text-3xl md:text-4xl font-bold text-ink tracking-tight mb-1.5">
        <span className="text-[#66B159]">{item.pre}</span>
        {n.toLocaleString()}
        <span className="text-[#66B159]">{item.suf}</span>
      </div>
      <p className="label-upper text-ghost">{item.label}</p>
    </motion.div>
  )
}

export function Stats() {
  const { ref, inView } = useInView(0.2)
  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="border-y border-zinc-800">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5">
        {data.map((d, i) => <Stat key={d.label} item={d} active={inView} i={i} />)}
      </div>
    </section>
  )
}
