'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ease } from '@/lib/utils'

const services = [
  { label: 'Revenue Management', href: '/revenue' },
  { label: 'Hotel Onboarding', href: '/onboarding' },
  { label: 'Dynamic Pricing', href: '/revenue' },
  { label: 'OTA Distribution', href: '/onboarding' },
  { label: 'Market Intelligence', href: '/revenue' },
  { label: 'Channel Management', href: '/onboarding' },
]

const company = [
  { label: 'About ProfitPro', href: '/about' },
  { label: 'Case Studies', href: '#' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Free Audit', href: '/contact' },
]

const platforms = ['MakeMyTrip', 'Booking.com', 'Agoda', 'Yatra', 'Expedia', 'Goibibo', 'Airbnb']

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 mt-8">
      {/* Main footer body */}
      <div className="max-w-6xl mx-auto px-6 md:px-10 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-5 group w-fit">
              <div className="w-7 h-7 rounded-md bg-[#66B159] group-hover:bg-[#73bd66] transition-colors duration-200 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 10V6l3-3 2 2 3-4v9" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 10h10" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-sans font-semibold text-ink text-base">ProfitPro</span>
            </Link>
            <p className="text-sub text-sm leading-relaxed mb-6 max-w-[220px]">
              Hotel revenue management and full OTA distribution - handled end-to-end, so you earn more without the complexity.
            </p>
            {/* Contact info */}
            <div className="space-y-2.5">
              <a href="mailto:hello@profitpro.in" className="flex items-center gap-2.5 text-ghost hover:text-ink text-xs font-sans transition-colors duration-200">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M1 4.5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                support@profitproz.com
              </a>
              <a href="tel:+919363509110" className="flex items-center gap-2.5 text-ghost hover:text-ink text-xs font-sans transition-colors duration-200">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <path d="M2 2.5C2 2 2.5 1.5 3 1.5h1.5l1 2.5-1 1c.5 1 1.5 2 2.5 2.5l1-1 2.5 1V9c0 .5-.5 1-1 1C5 10 2 6.5 2 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                +91 936 350 9110
              </a>
              <p className="flex items-center gap-2.5 text-ghost text-xs font-sans">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <circle cx="7" cy="6" r="2" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M7 1C4.5 1 2.5 3 2.5 5.5c0 3.5 4.5 7.5 4.5 7.5s4.5-4 4.5-7.5C11.5 3 9.5 1 7 1z" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                Coimbatore, India
              </p>
            </div>
          </div>

          {/* Services column */}
          <div>
            <p className="label-upper text-sub mb-5">Services</p>
            <ul className="space-y-3">
              {services.map((s) => (
                <li key={s.label}>
                  <Link href={s.href} className="text-ghost hover:text-ink text-sm font-sans transition-colors duration-200 hover:translate-x-0.5 inline-block transition-transform">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div>
            <p className="label-upper text-sub mb-5">Company</p>
            <ul className="space-y-3">
              {company.map((c) => (
                <li key={c.label}>
                  <Link href={c.href} className="text-ghost hover:text-ink text-sm font-sans transition-colors duration-200 inline-block">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platforms column */}
          <div>
            <p className="label-upper text-sub mb-5">OTA Platforms</p>
            <ul className="space-y-3">
              {platforms.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#66B159] flex-shrink-0" />
                  <span className="text-ghost text-sm font-sans">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-zinc-800 mt-12 mb-8" />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-ghost text-xs font-sans">
            © 2025 ProfitPro. All rights reserved. · Turn Potential Into Profit.
          </p>
          <div className="flex items-center gap-5">
            <span className="text-ghost text-xs font-sans">Privacy Policy</span>
            <span className="text-zinc-700">·</span>
            <span className="text-ghost text-xs font-sans">Terms of Service</span>
            <span className="text-zinc-700">·</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#66B159] pulse-dot" />
              <span className="text-ghost text-xs font-sans">All systems live</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
