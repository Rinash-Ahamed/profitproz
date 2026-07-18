'use client'

import { useRef } from 'react'
import { CalendarDays } from 'lucide-react'
import { formatDateOnlyDisplay } from '@/lib/date-only'

type DatePickerInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  className: string
  required?: boolean
  min?: string
  max?: string
}

export function DatePickerInput({ id, value, onChange, className, required, min, max }: DatePickerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const displayValue = formatDateOnlyDisplay(value)

  function openPicker() {
    const input = inputRef.current
    if (!input) return
    input.focus()
    try {
      input.showPicker?.()
    } catch {
      input.click()
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={displayValue}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openPicker()
          }
        }}
        className={`${className} cursor-pointer pr-12`}
        placeholder="DD-MM-YYYY"
        readOnly
        required={required}
      />
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
      />
      <button type="button" onClick={openPicker} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ghost transition-colors hover:bg-zinc-800 hover:text-ink" aria-label="Open date picker">
        <CalendarDays className="h-4 w-4" />
      </button>
    </div>
  )
}
