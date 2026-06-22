import { FiClock, FiMapPin, FiNavigation, FiInstagram, FiPhone } from 'react-icons/fi'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'

const mapUrl = 'https://www.google.com/maps?q=Rua%20Jos%C3%A9%20Firmino%20da%20Costa%2C%20481%2C%20Centro%2C%20Jaguaribe%2C%20CE%2C%2063745-000&output=embed'
const directionsUrl = 'https://www.google.com/maps/search/?api=1&query=Rua%20Jos%C3%A9%20Firmino%20da%20Costa%2C%20481%2C%20Centro%2C%20Jaguaribe%2C%20CE%2C%2063745-000'

export default function Location() {
  return (
    <section id="localizacao" className="premium-section py-16 md:py-20">
      <div className="section-shell">
        <SectionTitle eyebrow="Localização" title="Venha viver seu momento" />
        <Reveal>
          <div className="grid items-stretch gap-8 lg:grid-cols-[1fr_0.8fr]">
            <div className="relative h-[400px] w-full sm:h-[480px] lg:h-auto">
              <div className="absolute -inset-2 z-0 rounded-[2.5rem] bg-gradient-to-tr from-gold/20 to-transparent opacity-40 blur-xl"></div>
              <iframe title="Mapa do Studio Thallyta Silveira" src={mapUrl} className="relative z-10 h-full w-full rounded-[2rem] border border-gold/30 shadow-[0_0_30px_rgba(0,0,0,0.5)]" loading="lazy" />
            </div>
            
            <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[2.5rem] border border-gold/20 bg-gradient-to-b from-dark-card/90 to-dark/95 p-8 shadow-2xl backdrop-blur-md sm:p-10">
              <div className="absolute -inset-10 z-0 bg-gradient-to-bl from-gold/10 via-transparent to-transparent opacity-60 blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="mb-6 inline-flex size-14 items-center justify-center rounded-full border border-gold-light/30 bg-gradient-to-br from-gold to-gold-light text-2xl text-dark shadow-[0_0_20px_rgba(217,177,92,0.4)]">
                  <FiMapPin />
                </div>
                <h3 className="font-display text-4xl leading-tight">Studio de Beleza<br/><span className="text-gold-light italic">Thallyta Silveira</span></h3>
                <address className="mt-5 text-lg not-italic leading-relaxed text-cream/80">
                  Rua José Firmino da Costa, 481, Centro<br />
                  Jaguaribe - CE, CEP 63745-000<br />
                  <span className="text-cream/60">Ao lado do Carmela Dutra</span>
                </address>
                
                <div className="mt-8 flex gap-4 rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur transition-all hover:border-gold/20 hover:bg-white/10">
                  <FiClock className="mt-1 text-xl text-gold-light drop-shadow-[0_0_8px_rgba(217,177,92,0.5)]" />
                  <p className="text-sm font-medium leading-relaxed text-cream/90">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-gold-light/80">Horário de Funcionamento</span>
                    Segunda a sexta: 09:30 às 18:00<br />
                    <span className="text-cream/50">Pausa: 13:00 às 14:30</span><br />
                    <span className="text-cream/50">Sábado e Domingo: fechado</span>
                  </p>
                </div>
                
                <div className="mt-8 space-y-4 text-sm font-medium text-cream/80">
                  <p className="flex items-center gap-4">
                    <span className="grid size-10 place-items-center rounded-full bg-white/5 text-lg text-gold-light"><FiInstagram /></span>
                    <a href="http://instagram.com/studiodebelezathallytasilveira" target="_blank" rel="noreferrer" className="hover:text-gold-light hover:underline">@studiodebelezathallytasilveira</a>
                  </p>
                  <p className="flex items-center gap-4">
                    <span className="grid size-10 place-items-center rounded-full bg-white/5 text-lg text-gold-light"><FiPhone /></span>
                    (88) 98186-0582
                  </p>
                </div>
              </div>
              
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="gold-button relative z-10 mt-10 flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(217,177,92,0.25)]">
                <FiNavigation className="text-lg" /> Como Chegar
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
