import { FiAward, FiHeart, FiSmile } from 'react-icons/fi'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'

const pillars = [
  ['Beleza', FiSmile],
  ['Autocuidado', FiHeart],
  ['Confiança', FiAward],
]

export default function About() {
  return (
    <section id="sobre" className="py-6 md:py-8 lg:py-14">
      <div className="section-shell">
        <SectionTitle eyebrow="Conheça o Estúdio" title="Cuidado premium" text="Um espaço pensado para receber você com conforto, escuta e excelência em cada detalhe." />
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1fr] lg:gap-16">
          <Reveal>
            <div className="relative mx-auto max-w-sm lg:max-w-md">
              <div className="absolute -inset-2 z-0 rounded-t-full rounded-b-3xl bg-gradient-to-tr from-gold/30 via-transparent to-transparent opacity-60 blur-2xl"></div>
              <div className="gold-border relative z-10 overflow-hidden rounded-t-full rounded-b-3xl bg-dark-card p-2 shadow-2xl">
                <img src="/img/studio-06.jpeg" alt="Ambiente do Studio Thallyta Silveira" className="h-[460px] w-full rounded-t-full rounded-b-[1.5rem] object-cover transition-transform duration-700 hover:scale-105 sm:h-[520px]" loading="lazy" />
                <div className="pointer-events-none absolute inset-0 rounded-t-full rounded-b-[1.5rem] shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]"></div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative">
              <div className="absolute -left-6 top-0 hidden h-full w-px bg-gradient-to-b from-gold-light/50 via-gold/20 to-transparent lg:block"></div>
              <p className="text-lg leading-relaxed text-cream/80 lg:text-xl lg:leading-loose">
                <span className="mr-1 font-display text-3xl font-semibold text-gold-light">Thallyta Silveira</span> une técnica, delicadeza e atenção aos detalhes para criar resultados elegantes em cabelos e unhas em Jaguaribe, Ceará. A missão do studio é valorizar a beleza real de cada cliente com um atendimento acolhedor, pontual e sofisticado.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {pillars.map(([label, Icon]) => (
                <div key={label} className="about-pillar tap-gold gold-border group relative overflow-hidden rounded-2xl bg-dark-card/60 p-5 text-center backdrop-blur-sm transition-all hover:bg-gold/10">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
                  <Icon className="mx-auto mb-3 text-3xl text-gold-light/70 transition-transform duration-300 group-hover:scale-110 group-hover:text-gold-light" />
                  <p className="font-display text-xl font-medium tracking-wide text-cream/90 group-hover:text-gold-light">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-r from-black/40 to-black/10 p-6 backdrop-blur-md">
               <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-gold-light to-gold"></div>
               <h4 className="mb-2 text-sm font-bold uppercase tracking-widest text-gold-light">Especialidades</h4>
               <p className="text-sm leading-7 text-cream/70">
                 Atendimento especializado em <strong className="font-medium text-cream/90">nail design, alongamento, manutenção, escova, alisamento, botox capilar e finalizações</strong>.
               </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
