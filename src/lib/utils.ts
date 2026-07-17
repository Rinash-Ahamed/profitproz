export function formatNumber(value: number, locale = 'en-IN') {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value)
}

export const ease = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOut: [0.76, 0, 0.24, 1] as [number, number, number, number],
  spring: { type: 'spring' as const, stiffness: 140, damping: 24, mass: 0.8 },
}
