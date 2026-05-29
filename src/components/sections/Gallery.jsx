import { useEffect, useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiZoomIn } from 'react-icons/fi'
import { galleryImages } from '../../data/gallery.js'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import GalleryModal from '../ui/GalleryModal.jsx'

const filters = ['Todas', 'Unhas', 'Cabelo', 'Estúdio']

export default function Gallery() {
  const [filter, setFilter] = useState('Todas')
  const [index, setIndex] = useState(null)
  const [active, setActive] = useState(0)
  const images = useMemo(() => (filter === 'Todas' ? galleryImages : galleryImages.filter((image) => image.category === filter)), [filter])
  const activeImage = images[active]

  useEffect(() => {
    setActive(0)
  }, [filter])

  useEffect(() => {
    if (images.length <= 1) return undefined

    const timer = setInterval(() => {
      setActive((current) => (current + 1) % images.length)
    }, 4200)

    return () => clearInterval(timer)
  }, [images.length])

  const move = (direction) => {
    setActive((current) => (current + direction + images.length) % images.length)
  }

  return (
    <section id="galeria" className="premium-section py-16 md:py-20">
      <div className="section-shell">
        <SectionTitle eyebrow="Galeria" title="Resultados e detalhes do studio" />
        <Reveal>
          <div className="mb-8 flex flex-wrap justify-center gap-3">
            {filters.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setFilter(item)
                  setIndex(null)
                  setActive(0)
                }}
                className={`tap-gold rounded-full px-4 py-2 text-sm font-bold ${
                  filter === item ? 'silver-glow bg-gold text-dark' : 'border border-gold/30 bg-white/10 text-gold-light backdrop-blur'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          {activeImage && (
            <div className="gallery-slider gold-border mx-auto max-w-5xl rounded-lg bg-dark-card/75 p-3 md:p-5">
              <div className="flex items-center gap-3 md:gap-5">
                <button
                  type="button"
                  onClick={() => move(-1)}
                  className="gallery-slider-arrow tap-gold grid size-11 shrink-0 place-items-center rounded-full border border-gold/35 bg-black/35 text-xl text-gold-light backdrop-blur md:size-12"
                  aria-label="Imagem anterior"
                >
                  <FiChevronLeft />
                </button>

                <button type="button" onClick={() => setIndex(active)} className="gallery-slider-photo tap-gold group relative min-w-0 flex-1 overflow-hidden rounded-lg text-left">
                  <img src={activeImage.src} alt={activeImage.alt} loading="lazy" className="h-[420px] w-full rounded-lg object-cover transition duration-700 group-hover:scale-105 md:h-[560px]" />
                  <span className="absolute inset-0 grid place-items-center bg-black/0 text-4xl text-dark transition group-hover:bg-gold/62">
                    <FiZoomIn className="opacity-0 transition group-hover:opacity-100" />
                  </span>
                  <span className="absolute bottom-4 left-4 rounded-full border border-gold/25 bg-black/55 px-4 py-2 text-sm font-bold text-cream backdrop-blur-md">
                    {activeImage.category}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => move(1)}
                  className="gallery-slider-arrow tap-gold grid size-11 shrink-0 place-items-center rounded-full border border-gold/35 bg-black/35 text-xl text-gold-light backdrop-blur md:size-12"
                  aria-label="Proxima imagem"
                >
                  <FiChevronRight />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                {images.map((image, imageIndex) => (
                  <button
                    key={image.src}
                    type="button"
                    onClick={() => setActive(imageIndex)}
                    className={`h-2.5 rounded-full transition-all ${active === imageIndex ? 'w-9 bg-gold-light shadow-[0_0_18px_rgba(247,230,168,0.45)]' : 'w-2.5 bg-cream/35 hover:bg-gold/70'}`}
                    aria-label={`Ir para imagem ${imageIndex + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </Reveal>
      </div>
      <GalleryModal images={images} index={index} setIndex={setIndex} onClose={() => setIndex(null)} />
    </section>
  )
}
