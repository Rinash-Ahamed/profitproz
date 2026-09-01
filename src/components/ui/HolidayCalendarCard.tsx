'use client'

import { CalendarDays, ChevronDown } from 'lucide-react'
import { formatDateOnlyDisplay, todayInTimeZone } from '@/lib/date-only'
import { daysUntilHoliday, nextProfitProHoliday, PROFITPRO_HOLIDAYS_2026 } from '@/lib/holidays'

function holidayDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`)
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function HolidayCalendarCard() {
  const today = todayInTimeZone('Asia/Kolkata')
  const nextHoliday = nextProfitProHoliday(today)
  const daysAway = nextHoliday ? daysUntilHoliday(today, nextHoliday.date) : null

  return (
    <section className="staff-work-card overflow-hidden rounded-lg" aria-labelledby="holiday-calendar-title">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#66B159]/10 text-[#66B159]"><CalendarDays className="h-5 w-5" /></div>
          <div>
            <p id="holiday-calendar-title" className="text-base font-semibold text-ink">2026 ProfitPro Holiday Calendar</p>
            <p className="mt-1 text-sm text-sub">Tamil Nadu holidays</p>
          </div>
        </div>
        {nextHoliday ? <div className="rounded-lg border border-[#66B159]/25 bg-[#66B159]/10 px-4 py-3 sm:min-w-72">
          <p className="label-upper text-[#66B159]">Next holiday</p>
          <div className="mt-1 flex items-end justify-between gap-4"><div><p className="font-semibold text-ink">{nextHoliday.name}</p><p className="mt-0.5 text-xs text-sub">{holidayDateLabel(nextHoliday.date)}</p></div><span className="whitespace-nowrap text-xs font-semibold text-[#66B159]">{daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `${daysAway} days`}</span></div>
        </div> : <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-sub">No remaining 2026 holidays</div>}
      </div>

      <details className="group border-t border-zinc-800">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-semibold text-sub transition-colors hover:bg-zinc-900/60 hover:text-ink sm:px-6">View all 2026 holidays<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
        <div className="grid border-t border-zinc-800 sm:grid-cols-2">
          {PROFITPRO_HOLIDAYS_2026.map((holiday) => {
            const isPast = holiday.date < today
            const isNext = holiday.date === nextHoliday?.date
            return <div key={holiday.date} className={`flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-3 last:border-b-0 sm:px-6 sm:[&:nth-last-child(-n+2)]:border-b-0 ${isPast ? 'opacity-45' : ''} ${isNext ? 'bg-[#66B159]/5' : ''}`}><div className="min-w-0"><p className={`text-sm font-medium ${isNext ? 'text-[#66B159]' : 'text-ink'}`}>{holiday.name}</p><p className="mt-0.5 text-xs text-sub">{holidayDateLabel(holiday.date)}</p></div>{isPast ? <span className="text-[10px] font-medium uppercase tracking-wide text-ghost">Past</span> : null}</div>
          })}
        </div>
      </details>
      <span className="sr-only">Today is {formatDateOnlyDisplay(today)}</span>
    </section>
  )
}
