import type { Metadata } from 'next'
import { Instrument_Serif, Inter } from 'next/font/google'
import './globals.css'
import { SmoothScroll } from '@/components/layout/SmoothScroll'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

const instrument = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
  weight: ['400'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'ProfitPro - Hotel Revenue & Distribution',
  description:
    'Revenue management and OTA onboarding for hotels that want to grow. Dynamic pricing, market intelligence, and full-channel setup across 7+ platforms.',
  keywords:
    'hotel revenue management, OTA onboarding, hotel distribution, dynamic pricing, Booking.com, MakeMyTrip',
  icons: {
    icon: '/login-whiteBG.ico',
    shortcut: '/login-whiteBG.ico',
    apple: '/login-whiteBG.ico',
  },
  openGraph: {
    title: 'ProfitPro - Turn Potential Into Profit',
    description: 'Hotel revenue management and OTA distribution specialists.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable}`}>
      <body className="bg-zinc-1000 text-ink antialiased overflow-x-hidden">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  )
}
