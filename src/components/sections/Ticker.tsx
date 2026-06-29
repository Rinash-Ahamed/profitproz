'use client'
import { motion } from 'framer-motion'
import { memo } from 'react'
import Image from 'next/image'

const logos = [
]

function LogoItem({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex items-center justify-center px-10 flex-shrink-0 h-full">
      <Image src={src} alt={alt} width={120} height={40} className="h-9 w-auto object-contain opacity-70" />
    </div>
  )
}

function TickerComponent({ logos }: { logos: { src: string; alt: string }[] }) {
  const wideBlock = [...logos, ...logos, ...logos];
  const row1 = [...wideBlock, ...wideBlock];

  return (
    <motion.div
      className="relative bg-zinc-900/50 border-y border-zinc-800 overflow-hidden"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, #09090B, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(-90deg, #09090B, transparent)' }} />

      <div className="overflow-hidden py-6">
        <div className="ticker-track flex items-center h-full">
          {row1.map((logo, i) => <LogoItem key={`${logo.alt}-${i}`} {...logo} />)}
        </div>
      </div>
    </motion.div>
  )
}

export const Ticker = memo(TickerComponent)
