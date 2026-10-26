'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Mail, MessageCircle, RotateCcw, SkipForward, X } from 'lucide-react'
import { PortalActionButton } from '@/components/ui/PortalActionButton'
import { getProvyWhatsAppUrl, provyQuestions, provyServices, validateProvyAnswer, type ProvyDetails } from '@/lib/provy'

const initialDetails: ProvyDetails = { name: '', hotel: '', phone: '', email: '', message: '', service: '' }
const actionClass = 'justify-center rounded-xl border border-zinc-700 px-3 py-2.5 text-sm text-ink hover:border-[#66B159] disabled:opacity-50'

export default function ProvyChat({ onClose }: { onClose: () => void }) {
  const [details, setDetails] = useState<ProvyDetails>(initialDetails)
  const [step, setStep] = useState(-1)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const busyRef = useRef(false)
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const question = provyQuestions[step]
  const complete = step === provyQuestions.length

  useEffect(() => { dialogRef.current?.focus() }, [])
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [step, submitted])

  function next(value: string) {
    if (!question) return
    const validation = validateProvyAnswer(question.key, value)
    if (validation) { setError(validation); return }
    setDetails((current) => ({ ...current, [question.key]: value.trim() }))
    setAnswer('')
    setError('')
    setStep((current) => current + 1)
  }

  function reset() {
    setDetails(initialDetails)
    setStep(-1)
    setAnswer('')
    setError('')
    setConsent(false)
    setSubmitted(false)
  }

  async function sendEmail() {
    if (!complete || !consent || busyRef.current || submitted) return
    busyRef.current = true
    setSending(true)
    setError('')
    try {
      const response = await fetch('/api/submit-contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, rooms: '' }), signal: AbortSignal.timeout(30000),
      })
      const result = await response.json()
      if (!response.ok || result.success !== true) throw new Error('Submission failed')
      setSubmitted(true)
    } catch {
      setError('We could not confirm submission. Please try WhatsApp instead, or contact support@profitproz.com. Avoid resending if our team has already received it.')
    } finally {
      busyRef.current = false
      setSending(false)
    }
  }

  return <section
    ref={dialogRef}
    role="dialog"
    aria-modal="false"
    aria-labelledby="provy-title"
    tabIndex={-1}
    onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } }}
    className="fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+6.5rem)] right-3 z-[80] flex max-h-[calc(100dvh-9rem)] w-[calc(100%-1.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-[#66B159]/40 bg-zinc-950 text-ink shadow-[0_20px_80px_rgba(0,0,0,0.6)] outline-none md:right-6"
  >
    <header className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-[#66B159]/10 p-4">
      <Image src="/provy.png" alt="" width={48} height={48} sizes="48px" className="h-12 w-12 object-contain" />
      <div className="flex-1"><h2 id="provy-title" className="font-semibold">Hi, I’m Provy!</h2><p className="text-xs text-sub">ProfitPro · Guided enquiry assistant</p></div>
      <button type="button" onClick={onClose} aria-label="Close Provy chat" title="Close chat" className="rounded-lg p-2 text-sub hover:bg-zinc-800 focus-visible:outline focus-visible:outline-[#66B159]"><X size={19} aria-hidden="true" /></button>
    </header>

    <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 text-sm">
      <p className="rounded-2xl rounded-tl-sm bg-zinc-900 p-3 leading-relaxed">I help hotels, stays and resorts connect with our team. Choose a service and I’ll prepare your enquiry for WhatsApp or email. I’m your guided assistant.</p>
      {step === -1 ? <div className="grid gap-2"><p className="text-xs font-medium text-sub">What can we help you with?</p>{provyServices.map((service) => <PortalActionButton key={service} className={actionClass} onClick={() => { setDetails((current) => ({ ...current, service })); setStep(0) }}><ArrowRight size={15} aria-hidden="true" />{service}</PortalActionButton>)}</div> : <>
        <p className="ml-8 rounded-2xl rounded-tr-sm border border-[#66B159]/25 bg-[#66B159]/10 p-3">{details.service}</p>
        {provyQuestions.slice(0, step).map((item) => <div key={item.key} className="space-y-2"><p className="text-xs text-sub">{item.label}</p><p className="ml-8 whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-zinc-800 p-3">{details[item.key] || 'Skipped'}</p></div>)}
      </>}
      {question && <p role="status" className="rounded-2xl rounded-tl-sm bg-zinc-900 p-3 leading-relaxed">{question.prompt}</p>}
      {complete && <div className="space-y-3">
        <p className="rounded-2xl rounded-tl-sm bg-zinc-900 p-3">{submitted ? 'Thank you! Your enquiry was submitted to our team by email. You can also continue on WhatsApp.' : 'Your enquiry is ready! Review your details above, then choose how to contact our team.'}</p>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-sub"><input type="checkbox" checked={consent} disabled={sending} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 accent-[#66B159]" /><span>I agree to share these details with ProfitPro to respond to my enquiry. <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#83cf76] underline">Privacy Policy</Link></span></label>
        <div className="grid gap-2">
          {consent ? <a href={getProvyWhatsAppUrl(details)} target="_blank" rel="noopener noreferrer" className={`portal-action ${actionClass} bg-[#66B159]/15`}><MessageCircle size={16} aria-hidden="true" />Continue on WhatsApp</a> : <PortalActionButton disabled className={actionClass}><MessageCircle size={16} aria-hidden="true" />Continue on WhatsApp</PortalActionButton>}
          <PortalActionButton disabled={!consent || sending || submitted} onClick={sendEmail} className={actionClass}>{submitted ? <Check size={16} aria-hidden="true" /> : <Mail size={16} aria-hidden="true" />}{sending ? 'Sending enquiry…' : submitted ? 'Email enquiry submitted' : 'Send enquiry by email'}</PortalActionButton>
          <p className="text-xs text-sub">WhatsApp opens a prepared message; tap Send there. Email submits directly to support@profitproz.com.</p>
        </div>
      </div>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </div>

    <div className="shrink-0 border-t border-zinc-800 p-4">
      {question && <form onSubmit={(event: FormEvent) => { event.preventDefault(); next(answer) }} className="space-y-2">
        <label htmlFor="provy-answer" className="block text-xs font-medium text-sub">{question.label}</label>
        {question.key === 'message' ? <textarea ref={inputRef} id="provy-answer" rows={3} maxLength={question.maxLength} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={question.placeholder} className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-base text-ink outline-none focus:border-[#66B159]" /> : <input ref={inputRef} id="provy-answer" type={question.type} autoComplete={question.key === 'phone' ? 'tel' : question.key === 'hotel' ? 'organization' : question.key} maxLength={question.maxLength} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={question.placeholder} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-base text-ink outline-none focus:border-[#66B159]" />}
        <div className="flex gap-2"><PortalActionButton type="submit" className={`${actionClass} flex-1`}><ArrowRight size={15} aria-hidden="true" />Continue</PortalActionButton>{question.key === 'email' && <PortalActionButton onClick={() => next('')} className={actionClass}><SkipForward size={15} aria-hidden="true" />Skip</PortalActionButton>}</div>
      </form>}
      {step >= 0 && <PortalActionButton disabled={sending} onClick={reset} className="mt-2 text-xs text-sub hover:text-ink"><RotateCcw size={13} aria-hidden="true" />Start again / change details</PortalActionButton>}
      <p className="mt-2 text-[11px] text-sub" role="status">{submitted ? 'Email submitted. Chat clears when closed.' : 'Details stay in this chat until you choose to send. Closing clears them.'}</p>
    </div>
  </section>
}
