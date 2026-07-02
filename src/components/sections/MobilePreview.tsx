'use client'
import Image from 'next/image'

const mobileImages = [
  { src: '/mobile/mob1.png', alt: 'revenue insights' },
  { src: '/mobile/mob2.png', alt: 'competitor rates' },
  { src: '/mobile/mob3.png', alt: 'occupancy overview' },
  { src: '/mobile/mob4.png', alt: 'dynamic pricing controls' },
]

export function MobilePreview() {
  return (
    <section className="relative pt-12 pb-10 md:pt-16 md:pb-12 px-6 md:px-10">
      <div className="absolute inset-x-0 top-8 mx-auto h-40 w-full max-w-4xl rounded-full bg-[radial-gradient(circle,_rgba(102,177,89,0.28)_0%,_rgba(102,177,89,0)_70%)] opacity-0 blur-3xl transition-all duration-500" />

      <div className="max-w-6xl mx-auto text-center relative z-10">
        {/* Header */}
        <div>
          <h2 className="headline text-ink">
            Take Control of Your Hotel Revenue with <span className="text-[#66B159]"><br />Expert Guidance</span>
          </h2>
        </div>

        {/* Image Grid */}
        <div className="mt-12 md:mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {mobileImages.map((img) => (
            <div key={img.src} className="group cursor-pointer">
              <div className="absolute inset-x-4 bottom-0 h-8 rounded-full bg-[radial-gradient(circle,_rgba(102,177,89,0.45)_0%,_rgba(102,177,89,0)_72%)] opacity-0 blur-2xl transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-1" />
              <div className="relative overflow-hidden rounded-3xl transition-transform duration-300 group-hover:-translate-y-2">
                <Image src={img.src} alt={img.alt} width={400} height={800} className="rounded-3xl object-contain" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}