import { FiClock, FiMapPin, FiNavigation } from 'react-icons/fi'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'

const mapUrl = 'https://www.google.com/maps?q=Rua%20Jos%C3%A9%20Firmino%20da%20Costa%2C%20Centro%2C%20481&output=embed'
const directionsUrl = 'https://www.google.com/maps/search/?api=1&query=Rua%20Jos%C3%A9%20Firmino%20da%20Costa%2C%20Centro%2C%20481'

export default function Location() {
  return (
    <section id="localizacao" className="premium-section py-16 md:py-20">
      <div className="section-shell">
        <SectionTitle eyebrow="Localização" title="Venha viver seu momento" />
        <Reveal>
          <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_0.7fr]">
            <iframe title="Mapa do Studio Thallyta Silveira" src={mapUrl} className="gold-border h-[420px] w-full rounded-lg" loading="lazy" />
            <div className="gold-border flex h-full min-h-[420px] flex-col justify-between rounded-lg bg-dark-card/80 p-6">
              <FiMapPin className="mb-4 text-3xl text-gold-light" />
              <h3 className="font-display text-3xl">Studio de Beleza Thallyta Silveira</h3>
              <p className="mt-4 leading-7 text-cream/72">Rua José Firmino da Costa, Centro, 481 — Ao lado de Carmela Dutra</p>
              <div className="mt-6 flex gap-3 rounded-md border border-dark-border bg-white/10 p-4 backdrop-blur">
                <FiClock className="mt-1 text-gold-light" />
                <p className="text-sm leading-7 text-cream/72">Domingo a sexta: 09:00 às 18:00<br />Sábado: fechado</p>
              </div>
              <p className="mt-5 text-sm text-cream/72"><a href="http://instagram.com/studiodebelezathallytasilveira" target="_blank" rel="noreferrer" className="text-gold-light hover:underline">@studiodebelezathallytasilveira</a><br />(88) 98186-0582</p>
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="gold-button mt-6 inline-flex w-fit items-center gap-2 rounded-md px-5 py-3 font-bold">
                <FiNavigation /> Como Chegar
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
