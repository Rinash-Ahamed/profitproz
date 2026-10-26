import { getOtaLogos } from '@/lib/getOtaLogos'
import HomeClient from './HomeClient'
import { MobilePreview } from '@/components/sections/MobilePreview'
import { ServiceCards } from '@/components/sections/ServiceCards'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { Ticker } from '@/components/sections/Ticker'
import { Stats } from '@/components/sections/Stats'
import { Testimonials } from '@/components/sections/Testimonials'
import { HomeCTA } from '@/components/sections/HomeCTA'

export default function Page() {
  const otaLogos = getOtaLogos()
  return (
    <div className="min-h-[100dvh] bg-zinc-1000">
      <Nav />
      <HomeClient />
      {otaLogos.length > 0 && (
        <div className="py-12 text-center">
          <p className="label-upper text-sub mb-6">Powering listings on every major platform</p>
          <Ticker logos={otaLogos} duration={40} />
        </div>
      )}
      <div className="pt-2 md:pt-4"><MobilePreview /></div>
      <div className="-mt-2 md:-mt-4 pt-2 md:pt-4"><ServiceCards /></div>
      <Stats />
      <Testimonials />
      <HomeCTA />
      <Footer />
    </div>
  )
}
