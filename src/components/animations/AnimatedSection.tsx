'use client'
import { motion } from 'framer-motion'
import { useInView } from '@/hooks/useInView'
import { ease } from '@/lib/utils'

export function AnimatedSection({
  children,
  className = '',
  delay = 0,
  y = 24,
  amount = 0.15,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
  amount?: number
}) {
  const { ref, inView } = useInView(amount)

  return (
    <motion.div
      ref={ref as React.RefObject<HTMLElement>}
      className={className}
      initial={{ opacity: 0, y, willChange: 'transform, opacity' }}
      animate={inView ? { opacity: 1, y: 0, willChange: 'auto' } : {}}
      transition={{ duration: 0.7, ease: ease.out, delay }}
    >
      {children}
    </motion.div>
  )
}
