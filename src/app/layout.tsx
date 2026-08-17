import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Instrument_Serif, Inter } from 'next/font/google'
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration'
import { AppDialogProvider } from '@/components/ui/AppDialogProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
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
  manifest: '/manifest.webmanifest',
  applicationName: 'ProfitPro Portal',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ProfitPro',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/pwa-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'ProfitPro - Turn Potential Into Profit',
    description: 'Hotel revenue management and OTA distribution specialists.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#09090b',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-zinc-1000 text-ink font-sans antialiased overflow-x-hidden">
        <AppDialogProvider>{children}</AppDialogProvider>
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  )
}
