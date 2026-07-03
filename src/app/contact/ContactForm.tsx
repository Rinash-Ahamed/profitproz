'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from '@/hooks/useInView'
import { ease } from '@/lib/utils'

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

export function ContactForm() {
  const [form, setForm] = useState<FormData>(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, boolean>>>({})
  const { ref, inView } = useInView(0.15)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (submitted) {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [submitted]);

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
    <section ref={ref as React.RefObject<HTMLElement>} className="px-6 md:px-10 pb-24 max-w-6xl mx-auto">
      <div className="flex justify-center">
        <motion.div
          ref={containerRef}
          className="w-full max-w-3xl"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
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
                  We'll review your property details and get back to you within 12 hours with next steps.
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
                    className="group w-full bg-[#66B159] hover:bg-[#73bd66] disabled:opacity-40 disabled:cursor-not-allowed text-[#FFFCFC] font-sans font-semibold text-sm py-3.5 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
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
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform duration-200 group-hover:translate-x-1">
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
  )
}