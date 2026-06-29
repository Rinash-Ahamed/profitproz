'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'

const logos = [
  { src: '/ota/booking.com.png', alt: 'Booking.com' },
  { src: '/ota/airbnb.png', alt: 'Airbnb' },
  { src: '/ota/agoda.png', alt: 'Agoda' },
  { src: '/ota/expedia.png', alt: 'Expedia' },
  { src: '/ota/goibibo.png', alt: 'Goibibo' },
  { src: '/ota/mmt.png', alt: 'MakeMyTrip' },
]

function LogoItem({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex items-center justify-center px-6 border-r border-zinc-800 flex-shrink-0 h-full">
      <Image src={src} alt={alt} width={120} height={36} className="h-7 w-auto object-contain opacity-90" />
    </div>
  )
}

export function Ticker() {
  const row1 = [...logos, ...logos]
  const row2 = [...logos, ...logos]

  return (
    <motion.div
      className="border-y border-zinc-800 overflow-hidden"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, #09090B, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(-90deg, #09090B, transparent)' }} />

      <div className="overflow-hidden py-3 border-b border-zinc-800" style={{ height: '64px' }}>
        <div className="ticker-track flex items-center h-full">
          {row1.map((logo, i) => <LogoItem key={`${logo.alt}-${i}`} {...logo} />)}
        </div>
      </div>

      <div className="overflow-hidden py-3" style={{ height: '64px' }}>
        <div className="ticker-track-rev flex items-center h-full">
          {row2.map((logo, i) => <LogoItem key={`${logo.alt}-rev-${i}`} {...logo} />)}
        </div>
      </div>
    </motion.div>
  )
}
