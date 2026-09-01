import { parseDateOnly } from './date-only'

export type ProfitProHoliday = {
  date: string
  name: string
}

export const PROFITPRO_HOLIDAYS_2026: readonly ProfitProHoliday[] = [
  { date: '2026-01-15', name: 'Pongal' },
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-03-21', name: 'Eid-ul-Fitr' },
  { date: '2026-04-14', name: 'Tamil New Year / Dr. B.R. Ambedkar Jayanti' },
  { date: '2026-05-01', name: 'May Day' },
  { date: '2026-05-28', name: 'Eid-ul-Adha / Bakrid' },
  { date: '2026-08-15', name: 'Independence Day' },
  { date: '2026-10-02', name: 'Gandhi Jayanti' },
  { date: '2026-10-19', name: 'Ayutha Pooja' },
  { date: '2026-12-25', name: 'Christmas' },
] as const

export function nextProfitProHoliday(referenceDate: string) {
  return PROFITPRO_HOLIDAYS_2026.find((holiday) => holiday.date >= referenceDate) || null
}

export function daysUntilHoliday(referenceDate: string, holidayDate: string) {
  const reference = parseDateOnly(referenceDate)
  const holiday = parseDateOnly(holidayDate)
  if (!reference || !holiday) return null
  return Math.round((holiday.getTime() - reference.getTime()) / 86_400_000)
}
