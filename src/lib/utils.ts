import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, locale = 'en-IN') {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value)
}

// Luxury easing - used everywhere for consistency
export const ease = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOut: [0.76, 0, 0.24, 1] as [number, number, number, number],
  spring: { type: 'spring' as const, stiffness: 140, damping: 24, mass: 0.8 },
}

export const motionCardBase = {
  initial: { opacity: 0, y: 24, willChange: 'transform, opacity' },
  whileInView: { opacity: 1, y: 0, willChange: 'auto' },
  viewport: { once: true, amount: 0.2 },
}

// Stagger children preset
export const stagger = (base = 0.1, delay = 0) => ({
  hidden: {},
  show: {
    transition: { staggerChildren: base, delayChildren: delay },
  },
})

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}
