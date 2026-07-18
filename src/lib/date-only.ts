const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseDateOnly(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date
}

export function formatDateOnly(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export function todayLocalDateOnly(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatDateOnlyDisplay(value: string) {
  return parseDateOnly(value) ? value.split('-').reverse().join('-') : ''
}

export function addDateOnlyDays(value: string, days: number) {
  const date = parseDateOnly(value)
  if (!date) return ''
  date.setUTCDate(date.getUTCDate() + days)
  return formatDateOnly(date)
}

export function dateOnlyDay(value: string) {
  return parseDateOnly(value)?.getUTCDay() ?? -1
}

export function countDateOnlyDaysInclusive(startValue: string, endValue: string) {
  const start = parseDateOnly(startValue)
  const end = parseDateOnly(endValue)
  if (!start || !end || end < start) return 0
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
}

export function formatDateOnlyForLocale(value: string, options: Intl.DateTimeFormatOptions) {
  const date = parseDateOnly(value)
  return date ? date.toLocaleDateString('en-IN', { ...options, timeZone: 'UTC' }) : ''
}
