'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ease } from '@/lib/utils'

const links = [
  { label: 'Home', href: '/' },
  { label: 'Revenue Management', href: '/revenue' },
  { label: 'Hotel Onboarding', href: '/onboarding' },
  { label: 'Testimonials', href: '/#testimonials' },
  { label: 'Contact', href: '/contact' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const path = usePathname()

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => { setOpen(false) }, [path])

  return (
    <motion.header
      className="fixed top-0 inset-x-0 z-50"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: ease.out, delay: 0.1 }}
    >
      <div
        className="mx-4 mt-3 rounded-xl flex items-center justify-between h-13 px-5 transition-[background-color,border-color,transform] duration-300 will-change-transform"
        style={{
          height: '52px',
          backgroundColor: scrolled ? '#111113' : 'rgba(9,9,11,0.5)',
          borderColor: scrolled ? '#27272A' : 'rgba(39,39,42,0.5)',
          borderWidth: '1px',
          borderStyle: 'solid',
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-[#66B159] shadow-[0_10px_24px_rgba(102,177,89,0.24)] ring-1 ring-white/10">
            <Image src="/logo.png" alt="ProfitPro logo" width={24} height={24} className="object-contain" />
          </div>
          <span className="text-ink font-sans font-semibold text-sm tracking-tight">ProfitPro</span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const isExternal = l.href.startsWith('http')
            return isExternal ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="relative px-3.5 py-2 rounded-lg text-sm font-sans transition-colors duration-200 text-sub hover:text-ink hover:bg-zinc-900"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className={`relative px-3.5 py-2 rounded-lg text-sm font-sans transition-colors duration-200 ${
                  path === l.href ? 'text-ink bg-zinc-800' : 'text-sub hover:text-ink hover:bg-zinc-900'
                }`}
              >
                {l.label}
                {path === l.href && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-lg bg-zinc-800 -z-10"
                    transition={{ duration: 0.3, ease: ease.out }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="hidden md:flex items-center gap-2 bg-[#66B159] hover:bg-[#73bd66] text-[#FFFCFC] text-xs font-sans font-semibold px-4 py-2 rounded-lg transition-colors duration-200"
          >
            Free Audit
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 5.5h8M6 2l3.5 3.5L6 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          {/* Mobile toggle */}
          <button
            className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <motion.span
              className="block w-4 h-px bg-ink rounded-full"
              animate={open ? { rotate: 45, y: 3.5 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.22 }}
            />
            <motion.span
              className="block w-4 h-px bg-ink rounded-full"
              animate={open ? { rotate: -45, y: -3.5 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.22 }}
            />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="md:hidden mx-4 mt-1.5 rounded-xl overflow-hidden"
            style={{ backgroundColor: '#111113', border: '1px solid #27272A' }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: ease.out }}
          >
            <div className="p-3 flex flex-col gap-0.5">
              {links.map((l) => {
                const isExternal = l.href.startsWith('http')
                return isExternal ? (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-3 rounded-lg text-sm font-sans transition-colors duration-150 text-sub hover:text-ink hover:bg-zinc-900"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`px-3.5 py-3 rounded-lg text-sm font-sans transition-colors duration-150 ${
                      path === l.href ? 'text-ink bg-zinc-800' : 'text-sub hover:text-ink hover:bg-zinc-900'
                    }`}
                  >
                    {l.label}
                  </Link>
                )
              })}
              <div className="h-px bg-zinc-800 my-2 mx-1" />
              <Link
                href="/contact"
                className="mx-1 flex items-center justify-center gap-2 bg-[#66B159] text-[#FFFCFC] text-sm font-sans font-semibold py-2.5 rounded-lg"
              >
                Get Free Audit
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
