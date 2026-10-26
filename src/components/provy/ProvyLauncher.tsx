'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { MessageCircle } from 'lucide-react'

const ProvyChat = dynamic(() => import('./ProvyChat'), {
  ssr: false,
  loading: () => <p role="status" className="fixed bottom-28 right-4 z-[80] rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-ink">Opening Provy…</p>,
})

export function ProvyLauncher() {
  const [open, setOpen] = useState(false)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const close = () => {
    setOpen(false)
    launcherRef.current?.focus()
  }

  return <>
    <button
      ref={launcherRef}
      type="button"
      onClick={() => open ? close() : setOpen(true)}
      aria-expanded={open}
      aria-haspopup="dialog"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[80] flex items-center gap-2 rounded-2xl border border-[#66B159]/50 bg-zinc-950 px-3 py-2 text-left text-ink shadow-[0_8px_40px_rgba(0,0,0,0.4)] transition-colors hover:border-[#66B159] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#66B159] md:right-6"
    >
      <Image src="/provy.png" alt="" width={64} height={64} sizes="64px" className="h-16 w-16 object-contain" />
      <span><span className="flex items-center gap-2 text-sm font-semibold"><MessageCircle size={15} aria-hidden="true" />Ask Provy</span><span className="mt-1 block text-xs text-sub">Your enquiry buddy</span></span>
    </button>
    {open && <ProvyChat onClose={close} />}
  </>
}
