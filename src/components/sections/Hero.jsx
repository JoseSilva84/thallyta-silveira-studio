import { motion } from 'framer-motion'
import { FiArrowRight } from 'react-icons/fi'

export default function Hero() {
  return (
    <section id="inicio" className="relative min-h-screen pt-28">
      <div className="section-shell grid min-h-[calc(100vh-7rem)] items-center gap-10 pb-14 lg:grid-cols-[0.92fr_0.78fr]">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.34em] text-gold-light">Studio de Beleza</p>
          <h1 className="max-w-3xl font-display text-5xl font-semibold leading-none text-cream md:text-7xl lg:text-8xl">
            Bem-vinda ao seu momento de beleza.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-cream/72 md:text-lg">
            Cabelos e unhas com acabamento premium, atendimento cuidadoso e uma experiência feita para você se sentir confiante.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#agendamento" className="gold-button inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 font-bold">
              Começar Agendamento <FiArrowRight />
            </a>
            <a href="#sobre" className="tap-gold inline-flex items-center justify-center rounded-md border border-gold/40 bg-white/10 px-6 py-3 font-bold text-gold-light backdrop-blur hover:bg-white/15">
              Conheça o Estúdio
            </a>
          </div>
        </motion.div>
        <motion.div className="relative" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }}>
          <div className="gold-border silver-glow overflow-hidden rounded-[2rem] bg-dark-card p-2">
            <img src="/img/studio-12.jpeg" alt="Thallyta Silveira no Studio de Beleza" className="h-[440px] w-full rounded-[1.55rem] object-cover sm:h-[520px] lg:h-[560px]" loading="eager" />
          </div>
          <div className="absolute inset-x-2 bottom-2 h-40 rounded-b-[1.55rem] bg-gradient-to-t from-dark/82 to-transparent" />
          <span className="pointer-events-none absolute -right-4 top-10 h-28 w-px bg-gradient-to-b from-transparent via-gold-light to-transparent opacity-70" />
        </motion.div>
      </div>
    </section>
  )
}
