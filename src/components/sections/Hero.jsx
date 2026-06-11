import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { FiArrowRight } from 'react-icons/fi'

const heroImages = Array.from({ length: 7 }, (_, index) => `/img/${index + 1}.png`)

export default function Hero() {
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveImage((current) => (current + 1) % heroImages.length)
    }, 4200)

    return () => clearInterval(timer)
  }, [])

  return (
    <section id="inicio" className="relative pt-24 pb-12 sm:pt-28 md:min-h-0 lg:min-h-[100dvh] md:pt-36 lg:pt-28">
      <div className="section-shell flex flex-col md:grid md:min-h-0 lg:min-h-[calc(100vh-7rem)] md:items-center gap-6 sm:gap-8 md:gap-10 pb-20 md:pb-14 md:grid-cols-[0.92fr_0.78fr]">
        <motion.div className="flex flex-col sm:items-center md:items-start" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.34em] text-gold-light sm:text-center md:text-left">Studio de Beleza</p>
          <div className="hero-logo-wrap w-[85%] max-w-[280px] sm:w-[90%] sm:max-w-[340px] md:w-[90%] md:max-w-[300px] lg:w-full lg:max-w-[400px]" aria-label="Thallyta Silveira Cabeleireira e Nail Designer">
            <img src="/logo.png" alt="Thallyta Silveira Cabeleireira e Nail Designer" className="hero-logo w-full" />
          </div>

          {/* MOBILE PHOTO STAGE */}
          <div className="hero-photo-stage relative my-6 mx-auto block w-[90%] max-w-[340px] md:hidden">
            <div className="hero-photo-aura" />
            <div className="hero-photo-frame gold-border silver-glow overflow-hidden rounded-[2rem] bg-dark-card p-2">
              <div className="relative h-[360px] w-full rounded-[1.55rem] sm:h-[400px]">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={heroImages[activeImage]}
                    src={heroImages[activeImage]}
                    alt="Thallyta Silveira no Studio de Beleza"
                    className="hero-photo absolute inset-0 h-full w-full rounded-[1.55rem] object-contain"
                    loading={activeImage === 0 ? 'eager' : 'lazy'}
                    initial={{ opacity: 0, scale: 1.035, x: 18, filter: 'blur(8px) saturate(1.05)' }}
                    animate={{ opacity: 1, scale: 1.02, x: 0, filter: 'blur(0px) saturate(1.05)' }}
                    exit={{ opacity: 0, scale: 0.985, x: -18, filter: 'blur(8px) saturate(1.05)' }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                </AnimatePresence>
              </div>
            </div>
            <div className="absolute inset-x-2 bottom-2 h-40 rounded-b-[1.55rem] bg-gradient-to-t from-dark/82 to-transparent" />
          </div>

          <p className="mt-4 max-w-xl text-base leading-8 text-cream/72 sm:text-center sm:mx-auto md:text-left md:text-lg md:mx-0">
            Bem-vinda ao seu momento de cuidado, beleza e confiança.
          </p>
          <div className="mt-6 flex flex-col sm:justify-center gap-3 sm:flex-row md:justify-start">
            <a href="#agendamento" className="gold-button inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 font-bold">
              Começar Agendamento <FiArrowRight />
            </a>
            <a href="#sobre" className="tap-gold inline-flex items-center justify-center rounded-md border border-gold/40 bg-white/10 px-6 py-3 font-bold text-gold-light backdrop-blur hover:bg-white/15">
              Conheça o Estudio
            </a>
          </div>
        </motion.div>
        
        {/* DESKTOP PHOTO STAGE */}
        <motion.div className="hero-photo-stage relative hidden md:block" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }}>
          <div className="hero-photo-aura" />
          <div className="hero-photo-frame gold-border silver-glow overflow-hidden rounded-[2rem] bg-dark-card p-2">
            <div className="relative h-[440px] w-full rounded-[1.55rem] sm:h-[480px] lg:h-[520px]">
              <AnimatePresence mode="wait">
                <motion.img
                  key={heroImages[activeImage]}
                  src={heroImages[activeImage]}
                  alt="Thallyta Silveira no Studio de Beleza"
                  className="hero-photo absolute inset-0 h-full w-full rounded-[1.55rem] object-contain"
                  loading={activeImage === 0 ? 'eager' : 'lazy'}
                  initial={{ opacity: 0, scale: 1.035, x: 18, filter: 'blur(8px) saturate(1.05)' }}
                  animate={{ opacity: 1, scale: 1.02, x: 0, filter: 'blur(0px) saturate(1.05)' }}
                  exit={{ opacity: 0, scale: 0.985, x: -18, filter: 'blur(8px) saturate(1.05)' }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </AnimatePresence>
            </div>
          </div>
          <div className="absolute inset-x-2 bottom-2 h-40 rounded-b-[1.55rem] bg-gradient-to-t from-dark/82 to-transparent" />
          <span className="pointer-events-none absolute -right-4 top-10 h-28 w-px bg-gradient-to-b from-transparent via-gold-light to-transparent opacity-70" />
        </motion.div>
      </div>
    </section>
  )
}
