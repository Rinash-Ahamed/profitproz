'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { ease } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'

/* ── Form state types ───────────────────────────────── */
type FormData = {
  name: string
  email: string
  phone: string
  hotel: string
  rooms: string
  service: string
  message: string
}

const initialForm: FormData = {
  name: '', email: '', phone: '', hotel: '', rooms: '', service: '', message: '',
}

/* ── FAQ ────────────────────────────────────────────── */
const faqs = [
  {
    q: 'How quickly can you start managing our revenue?',
    a: 'We can audit your property and deploy a pricing strategy within 5–7 business days. Most hotels see measurable rate improvement within the first two weeks.',
  },
  {
    q: 'Do we need a channel manager already?',
    a: 'No. If you don\'t have one, we recommend and set up the right channel manager for your property size as part of the onboarding process.',
  },
  {
    q: 'What OTAs do you cover in onboarding?',
    a: 'MakeMyTrip, Booking.com, Agoda, Yatra, Expedia, Goibibo, and Airbnb - all seven, simultaneously, within 7 days.',
  },
  {
    q: 'How is your pricing structured?',
    a: 'We work on a monthly retainer based on property size and service scope. The free audit gives you a clear picture before you commit to anything.',
  },
  {
    q: 'Do you work with independent hotels or only chains?',
    a: 'Mostly independent hotels and small to mid-size properties across India - boutique hotels, business hotels, resorts, and homestays. That\'s our speciality.',
  },
  {
    q: 'What does the free revenue audit include?',
    a: 'A full review of your current pricing strategy, OTA positioning, competitor rates, and occupancy patterns - delivered as a clear report with specific recommendations.',
  },
]

function FAQItem({ item, i }: { item: typeof faqs[0]; i: number }) {
  const [open, setOpen] = useState(i === 0)

  return (
    <div className="border-b border-zinc-800">
      <button
        className="w-full flex items-center justify-between py-5 text-left group"
        onClick={() => setOpen(!open)}
      >
        <span className="font-sans font-medium text-ink text-sm pr-4 group-hover:text-[#66B159] transition-colors duration-200">
          {item.q}
        </span>
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25, ease: ease.out }}
          className="flex-shrink-0 w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 2v6M2 5h6" stroke={open ? '#66B159' : '#71717A'} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: ease.out }}
            className="overflow-hidden"
          >
            <p className="text-sub text-sm leading-relaxed pb-5">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Contact info cards ─────────────────────────────── */
const contactCards = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M2 6l7 5 7-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    label: 'Email',
    value: 'support@profitproz.com',
    sub: 'We reply within 4 hours',
    href: 'mailto:support@profitproz.com',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 3.5C3 3 3.5 2.5 4.5 2.5H6l1.5 3.5L6 7.5C6.5 9 8 10.5 9.5 11L11 9.5l3.5 1.5v1.5c0 1-.5 1.5-1 1.5C6 14 3 8.5 3 3.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: 'Phone',
    value: '+91 936 350 9110',
    sub: 'Mon–Sat, 9 AM – 8 PM IST',
    href: 'tel:+919363509110',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M9 2C6 2 3.5 4.5 3.5 7.5c0 4.5 5.5 8.5 5.5 8.5s5.5-4 5.5-8.5C14.5 4.5 12 2 9 2z" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
    label: 'Office',
    value: 'Coimbatore, India',
    sub: 'Serving hotels across India',
    href: undefined,
  },
]

export default function ContactPage() {
  const [form, setForm] = useState<FormData>(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, boolean>>>({})
  const formSection = useInView(0.15)
  const faqSection = useInView(0.15)
  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    const requiredFields: (keyof FormData)[] = ['name', 'phone', 'hotel', 'service'];
    const newErrors: Partial<Record<keyof FormData, boolean>> = {};
    requiredFields.forEach(field => {
      if (!form[field]) {
        newErrors[field] = true;
      }
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
  
    setLoading(true)
  
    try {
      const response = await fetch('/api/submit-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
  
      if (response.ok) {
        setSubmitted(true);
      } else {
        console.error('API submission failed:', await response.json());
        alert('Failed to submit form. Please try again later.'); // User feedback for API errors
      }
    } catch (error) {
      console.error('Network or API error:', error);
      alert('An unexpected error occurred. Please try again later.'); // User feedback for network errors
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full bg-zinc-900 border rounded-lg px-4 py-3 text-ink text-sm font-sans placeholder:text-ghost focus:outline-none focus:border-[#66B159] focus:ring-1 focus:ring-[#66B159]/40 transition-all duration-200'

  return (
    <div className="min-h-screen bg-zinc-1000">
      <Nav />

      {/* ── HERO ────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 px-6 md:px-10 max-w-6xl mx-auto overflow-hidden">
        {/* Subtle animated background */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(102, 177, 89, 0.1), transparent),
                            radial-gradient(ellipse 50% 40% at 20% 110%, rgba(102, 177, 89, 0.08), transparent),
                            radial-gradient(ellipse 50% 40% at 80% 100%, rgba(102, 177, 89, 0.08), transparent)`,
            backgroundRepeat: 'no-repeat',
          }}
        />

        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-2 rounded-full bg-[#66B159] pulse-dot" />
            <span className="label-upper text-sub">Contact Us</span>
          </div>

          {/* Staggered headline */}
          <div className="mb-5">
            <h1 className="headline text-ink">
              Let's grow your <span className="text-[#66B159]">hotel revenue.</span>
            </h1>
          </div>

          <p className="text-sub text-lg max-w-lg leading-relaxed">
            Start with a free audit - no commitment. We’re a new market entrant focused on helping hotels in Tamil Nadu unlock stronger revenue performance from day one.
          </p>
        </div>

        {/* Contact info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
          {contactCards.map((c) => {
            const Inner = (
              <div className="surface rounded-xl p-5 flex items-start gap-4 hover:border-zinc-600 transition-colors duration-200 h-full">
                <div className="w-9 h-9 rounded-lg surface-accent flex items-center justify-center flex-shrink-0 text-[#66B159]">
                  {c.icon}
                </div>
                <div>
                  <p className="label-upper text-ghost mb-1">{c.label}</p>
                  <p className="font-sans font-semibold text-ink text-sm mb-0.5">{c.value}</p>
                  <p className="text-ghost text-xs font-sans">{c.sub}</p>
                </div>
              </div>
            )
            return c.href ? (
              <a key={c.label} href={c.href}>{Inner}</a>
            ) : (
              <div key={c.label}>{Inner}</div>
            )
          })}
        </div>

      </section>

      {/* ── FORM + SIDEBAR ──────────────────────────── */}
      <section ref={formSection.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-24 max-w-6xl mx-auto">
        <div className="flex justify-center">

          {/* Form - 2 cols */}
          <motion.div
            className="w-full max-w-3xl"
            initial={{ opacity: 0, y: 24 }}
            animate={formSection.inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: ease.out }}
          >
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  className="surface rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[480px]"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: ease.out }}
                >
                  {/* Animated checkmark */}
                  <motion.div
                    className="w-16 h-16 rounded-full surface-accent flex items-center justify-center mb-6"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
                  >
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <motion.path
                        d="M6 14l5 5 11-11"
                        stroke="#66B159"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.3 }}
                      />
                    </svg>
                  </motion.div>
                  <motion.h3 className="font-sans font-bold text-ink text-xl mb-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ease.out, delay: 0.5 }}>
                    Message received
                  </motion.h3>
                  <motion.p className="text-sub text-sm max-w-xs leading-relaxed mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ease.out, delay: 0.6 }}>
                    We'll review your property details and get back to you within 4 hours with next steps.
                  </motion.p>
                  <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: ease.out, delay: 0.8 }}
                    onClick={() => { setSubmitted(false); setForm(initialForm) }}
                    className="text-[#66B159] text-sm font-sans hover:text-[#73bd66] transition-colors"
                  >
                    Send another enquiry
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  className="surface rounded-2xl p-8 md:p-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="font-sans font-semibold text-ink text-lg mb-1">Free Revenue Audit Request</p>
                  <p className="text-sub text-sm mb-8">Fill in your details and we'll prepare a personalised assessment.</p>

                  <div className="space-y-5">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="label-upper text-ghost">Your Name *</label>
                          {errors.name && <span className="text-red-400 text-xs font-sans">Required</span>}
                        </div>
                        <input
                          type="text"
                          placeholder="Rahul Sharma"
                          value={form.name}
                          onChange={set('name')}
                          className={`${inputClass} ${errors.name ? 'border-red-500/40' : 'border-zinc-700'}`}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="label-upper text-ghost">Email Address</label>
                        </div>
                        <input
                          type="email"
                          placeholder="rahul@hotel.com"
                          value={form.email}
                          onChange={set('email')}
                          className={`${inputClass} border-zinc-700`}
                        />
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="label-upper text-ghost">Phone Number *</label>
                          {errors.phone && <span className="text-red-400 text-xs font-sans">Required</span>}
                        </div>
                        <input
                          type="tel"
                          placeholder="+91 98000 00000"
                          value={form.phone}
                          onChange={set('phone')}
                          className={`${inputClass} ${errors.phone ? 'border-red-500/40' : 'border-zinc-700'}`}
                        />
                      </div>
                      <div>
                        <label className="label-upper text-ghost block mb-2">Number of Rooms</label>
                        <select value={form.rooms} onChange={set('rooms')} className={`${inputClass} border-zinc-700`}>
                          <option value="" disabled>Select room count</option>
                          <option value="1-15">1–15 rooms</option>
                          <option value="16-40">16–40 rooms</option>
                          <option value="41-100">41–100 rooms</option>
                          <option value="100+">100+ rooms</option>
                        </select>
                      </div>
                    </div>

                    {/* Hotel name */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="label-upper text-ghost">Hotel Name *</label>
                        {errors.hotel && <span className="text-red-400 text-xs font-sans">Required</span>}
                      </div>
                      <input
                        type="text"
                        placeholder="The Grand Coimbatore"
                        value={form.hotel}
                        onChange={set('hotel')}
                        className={`${inputClass} ${errors.hotel ? 'border-red-500/40' : 'border-zinc-700'}`}
                      />
                    </div>

                    {/* Service */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="label-upper text-ghost">What do you need? *</label>
                        {errors.service && <span className="text-red-400 text-xs font-sans">Required</span>}
                      </div>
                      <select value={form.service} onChange={set('service')} className={`${inputClass} ${errors.service ? 'border-red-500/40' : 'border-zinc-700'}`}>
                        <option value="" disabled>Select a service</option>
                        <option value="revenue">Revenue Management</option>
                        <option value="onboarding">Hotel Onboarding (OTA Setup)</option>
                        <option value="both">Both - Revenue + Onboarding</option>
                        <option value="audit">Just the Free Audit first</option>
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="label-upper text-ghost block mb-2">Anything else?</label>
                      <textarea
                        rows={4}
                        placeholder="Tell us about your property, current challenges, or what you'd like to improve…"
                        value={form.message}
                        onChange={set('message')}
                        className={`${inputClass} resize-none border-zinc-700`}
                      />
                    </div>

                    {/* Submit */}
                    <motion.button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading || !form.name || !form.phone || !form.hotel || !form.service}
                      className="w-full bg-[#66B159] hover:bg-[#73bd66] disabled:opacity-40 disabled:cursor-not-allowed text-[#FFFCFC] font-sans font-semibold text-sm py-3.5 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                      whileTap={{ scale: 0.98 }}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {loading ? (
                        <>
                          <motion.div
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          />
                          Sending…
                        </>
                      ) : (
                        <>
                          Request Free Audit
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </>
                      )}
                      </AnimatePresence>
                    </motion.button>

                    <p className="text-ghost text-xs font-sans text-center">
                      No commitment. No spam. Just a clear, honest assessment of your property's revenue potential.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────── */}
      <section ref={faqSection.ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-24 max-w-3xl mx-auto">
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={faqSection.inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: ease.out }}
        >
          <p className="label-upper text-sub mb-3">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight leading-tight">
            Questions we hear often
          </h2>
        </motion.div>
        <div>
          {faqs.map((f, i) => (
            <FAQItem key={f.q} item={f} i={i} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
