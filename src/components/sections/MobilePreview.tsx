'use client'
import Image from 'next/image'

const mobileImages = [
  { src: '/mobile/mob1.png', alt: 'revenue insights' },
  { src: '/mobile/mob2.png', alt: 'competitor rates' },
  { src: '/mobile/mobo3.png', alt: 'occupancy overview' },
  { src: '/mobile/mobo4.png', alt: 'dynamic pricing controls' },
]

export function MobilePreview() {
  return (
    <section className="pt-10 pb-8 md:pt-16 md:pb-10 px-6 md:px-10">
      <div className="max-w-6xl mx-auto text-center">
        {/* Header */}
        <div>
          <h2 className="headline text-ink">
            Take Control of Your Hotel Revenue with <span className="text-[#66B159]"><br />Expert Guidance</span>
          </h2>
        </div>

        {/* Image Grid */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {mobileImages.map((img) => (
            <div key={img.src} className="group cursor-pointer">
              <div className="relative overflow-hidden rounded-3xl transition-transform duration-300 md:group-hover:-translate-y-2">
                <Image src={img.src} alt={img.alt} width={400} height={800} className="rounded-3xl object-contain" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}