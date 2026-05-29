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
          <div className="gold-border mx-auto max-w-3xl rounded-lg bg-dark-card/80 p-8 text-center">
            <div className="mb-5 flex justify-center gap-1 text-gold-light">
              {Array.from({ length: 5 }).map((_, index) => <FiStar key={index} fill="currentColor" />)}
            </div>
            <p className="font-display text-3xl leading-snug text-cream">“{item.text}”</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className="silver-glow grid size-10 place-items-center rounded-full bg-gold font-bold text-dark">{item.name.slice(0, 1)}</span>
              <span className="font-bold text-cream/80">{item.name}</span>
            </div>
            <div className="mt-6 flex justify-center gap-2">
              {testimonials.map((testimonial, index) => (
                <button
                  key={testimonial.name}
                  onClick={() => setActive(index)}
                  aria-label={`Ver depoimento ${index + 1}`}
                  className={`tap-gold size-2.5 rounded-full ${active === index ? 'silver-glow bg-gold' : 'bg-cream/25'}`}
                />
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
