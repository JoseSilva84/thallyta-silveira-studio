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
    <section id="sobre" className="py-20">
      <div className="section-shell">
        <SectionTitle eyebrow="Conheça o Estúdio" title="Cuidado premium com toque pessoal" text="Um espaço pensado para receber você com conforto, escuta e excelência em cada detalhe." />
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1fr]">
          <Reveal>
            <img src="/img/studio-06.jpeg" alt="Ambiente do Studio Thallyta Silveira" className="gold-border h-[460px] w-full rounded-lg object-cover" loading="lazy" />
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-lg leading-9 text-cream/78">
              Thallyta Silveira une técnica, delicadeza e atenção aos detalhes para criar resultados elegantes em cabelos e unhas. A missão do studio é valorizar a beleza real de cada cliente com um atendimento acolhedor, pontual e sofisticado.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {pillars.map(([label, Icon]) => (
                <div key={label} className="about-pillar gold-border tap-gold rounded-lg bg-dark-card p-5 text-center">
                  <Icon className="mx-auto mb-3 text-2xl text-gold-light" />
                  <p className="font-display text-2xl font-semibold">{label}</p>
                </div>
              ))}
            </div>
            <p className="about-specialty mt-6 rounded-lg border border-gold/15 bg-black/25 p-5 text-sm leading-7 text-cream/68">
              Atendimento especializado em nail design, alongamento, manutenção, escova, alisamento, botox capilar e finalizações.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
