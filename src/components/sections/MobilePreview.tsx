'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useInView } from '@/hooks/useInView'
import { ease } from '@/lib/utils'

const mobileImages = [
  { src: '/mobile/mob1.png', alt: 'revenue insights' },
  { src: '/mobile/mob2.png', alt: 'competitor rates' },
  { src: '/mobile/mob3.png', alt: 'occupancy overview' },
  { src: '/mobile/mob4.png', alt: 'dynamic pricing controls' },
]

export function MobilePreview() {
  const { ref, inView } = useInView(0.1)

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-24 md:py-32 px-6 md:px-10">
      <div className="max-w-6xl mx-auto text-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: ease.out }}
        >
          <h2 className="headline text-ink">
            Take Control of Your Hotel Revenue with <span className="text-[#66B159]">Expert Guidance</span>
          </h2>
        </motion.div>

        {/* Image Grid */}
        <motion.div
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: ease.out, delay: 0.15 }}
        >
          {mobileImages.map((img, i) => (
            <motion.div
              key={img.src}
              className="group cursor-pointer"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.6, ease: ease.out, delay: i * 0.1 + 0.2 }}
            >
              <div className="relative transition-all duration-300 ease-out group-hover:-translate-y-2 group-active:-translate-y-2 group-hover:shadow-[0_25px_60px_-15px_rgba(102,177,89,0.25)] group-active:shadow-[0_25px_60px_-15px_rgba(102,177,89,0.25)] rounded-3xl">
                <Image src={img.src} alt={img.alt} width={400} height={800} className="rounded-3xl object-contain" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}