import type { InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'

type PortalSearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }

export function PortalSearchField({ label, className = 'sm:w-64', ...props }: PortalSearchFieldProps) {
  return <label className={`block w-full ${className}`}>
    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-sub">{label}</span>
    <span className="relative block">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost" />
      <input {...props} type="search" className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-sm text-ink placeholder:text-ghost focus:border-[#66B159] focus:outline-none" />
    </span>
  </label>
}
