import { useState } from 'react'
import { serviceGroups } from '../../data/services.js'
import { useBooking } from '../../context/BookingContext.jsx'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import ServiceCard from '../ui/ServiceCard.jsx'

export default function Services() {
  const [active, setActive] = useState(serviceGroups[0].id)
  const { addService } = useBooking()
  const group = serviceGroups.find((item) => item.id === active)

  return (
    <section id="servicos" className="premium-section py-16 md:py-20">
      <div className="section-shell">
        <SectionTitle eyebrow="Tabela de Preços" title="Escolha seu próximo cuidado" text="Adicione serviços ao agendamento e finalize escolhendo data e horário." />
        <Reveal>
          <div className="relative">
            <div className="absolute -inset-4 z-0 rounded-[3rem] bg-gradient-to-b from-gold/10 to-transparent opacity-50 blur-2xl"></div>
            <div className="gold-border relative z-10 rounded-[2.5rem] bg-black/40 p-5 backdrop-blur-xl sm:p-8 lg:p-10">
              <div className="mb-10 flex flex-wrap justify-center gap-3">
                {serviceGroups.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    className={`tap-gold rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-300 ${
                      active === item.id ? 'silver-glow scale-105 bg-gradient-to-r from-gold to-gold-light text-dark shadow-[0_0_20px_rgba(217,177,92,0.3)]' : 'border border-gold/20 bg-white/5 text-cream/70 backdrop-blur hover:border-gold/40 hover:bg-white/10 hover:text-gold-light'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="grid min-w-0 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.services.map((service) => (
                  <ServiceCard key={service.id} service={{ ...service, group: group.label }} onAdd={addService} />
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
