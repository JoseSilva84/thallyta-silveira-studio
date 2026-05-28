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
    <section id="servicos" className="py-16 md:py-20">
      <div className="section-shell">
        <SectionTitle eyebrow="Tabela de Preços" title="Escolha seu próximo cuidado" text="Adicione serviços ao agendamento e finalize escolhendo data e horário." />
        <Reveal>
          <div className="mb-8 flex flex-wrap justify-center gap-3">
            {serviceGroups.map((item) => (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`tap-gold rounded-full px-5 py-2 text-sm font-bold ${
                  active === item.id ? 'silver-glow bg-gold text-dark' : 'border border-gold/30 bg-white/10 text-gold-light backdrop-blur hover:bg-white/15'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.services.map((service) => (
              <ServiceCard key={service.id} service={{ ...service, group: group.label }} onAdd={addService} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
