import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { ContactForm } from './ContactForm'
import { FAQ } from './FAQ'

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
    sub: 'Our team will respond within 12 hours',
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
    sub: 'Partnering with hotels across India',
    href: undefined,
  },
]

export default function ContactPage() {
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
            Begin with a complimentary revenue performance audit and receive tailored recommendations to maximize occupancy, ADR, and overall profitability.
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
      <ContactForm />

      {/* ── FAQ ─────────────────────────────────────── */}
      <FAQ />

      <Footer />
    </div>
  )
}
