import { useEffect, useState } from 'react'
import { FiStar } from 'react-icons/fi'
import { testimonials } from '../../data/testimonials.js'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'

export default function Testimonials() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setActive((value) => (value + 1) % testimonials.length), 4200)
    return () => clearInterval(timer)
  }, [])

  const item = testimonials[active]

  return (
    <section className="py-20">
      <div className="section-shell">
        <SectionTitle eyebrow="Depoimentos" title="Experiências Reais" />
        <Reveal>
          <div className="relative mx-auto max-w-4xl">
            <div className="absolute -inset-4 z-0 rounded-[3rem] bg-gradient-to-b from-gold/10 to-transparent opacity-40 blur-2xl"></div>
            
            <div className="gold-border relative z-10 overflow-hidden rounded-[2.5rem] bg-black/40 p-8 text-center backdrop-blur-xl sm:p-12 lg:p-16">
              
              <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-8 select-none opacity-5">
                 <span className="font-serif text-[16rem] leading-none text-gold">"</span>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-8 flex justify-center gap-1.5 text-gold-light drop-shadow-[0_0_10px_rgba(217,177,92,0.4)]">
                  {Array.from({ length: 5 }).map((_, index) => <FiStar key={index} className="size-5 sm:size-6" fill="currentColor" />)}
                </div>
                
                <p className="min-h-[8rem] font-display text-2xl font-light italic leading-relaxed text-cream/95 sm:min-h-[6rem] sm:text-3xl lg:text-4xl">
                  “{item.text}”
                </p>
                
                <div className="mt-10 flex items-center justify-center gap-4">
                  <span className="grid size-12 place-items-center rounded-full border border-gold-light/30 bg-gradient-to-br from-gold to-gold-light font-display text-xl font-bold text-dark shadow-[0_0_20px_rgba(217,177,92,0.4)] sm:size-14 sm:text-2xl">
                    {item.name.slice(0, 1)}
                  </span>
                  <div className="text-left">
                    <span className="block font-display text-lg font-bold text-cream">{item.name}</span>
                    <span className="block text-xs font-semibold tracking-widest uppercase text-gold-light/70">Cliente</span>
                  </div>
                </div>
                
                <div className="mt-10 flex justify-center gap-2.5">
                  {testimonials.map((testimonial, index) => (
                    <button
                      key={testimonial.name}
                      onClick={() => setActive(index)}
                      aria-label={`Ver depoimento ${index + 1}`}
                      className={`h-2.5 rounded-full transition-all duration-300 ${active === index ? 'w-10 bg-gradient-to-r from-gold to-gold-light shadow-[0_0_15px_rgba(217,177,92,0.5)]' : 'w-2.5 bg-white/20 hover:scale-110 hover:bg-gold/50'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
