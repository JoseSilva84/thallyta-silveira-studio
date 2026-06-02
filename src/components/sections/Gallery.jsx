import { useEffect, useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiZoomIn } from 'react-icons/fi'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import GalleryModal from '../ui/GalleryModal.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const filters = ['Todas', 'Unhas', 'Cabelo', 'Estúdio']

export default function Gallery() {
  const [filter, setFilter] = useState('Todas')
  const [index, setIndex] = useState(null)
  const [active, setActive] = useState(0)
  const [galleryImages, setGalleryImages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch(`${API}/gallery`)
        if (res.ok) {
          const data = await res.json()
          setGalleryImages(data)
        }
      } catch (error) {
        console.error('Erro ao carregar imagens da galeria:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchImages()
  }, [])

  const images = useMemo(() => {
    if (!galleryImages || galleryImages.length === 0) return []
    return filter === 'Todas' ? galleryImages : galleryImages.filter((image) => image.category === filter)
  }, [filter, galleryImages])

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
          <div className="relative">
            <div className="absolute -inset-4 z-0 rounded-[3rem] bg-gradient-to-b from-gold/10 to-transparent opacity-40 blur-2xl"></div>
            <div className="gold-border relative z-10 mx-auto max-w-5xl rounded-[2.5rem] bg-black/40 p-4 backdrop-blur-xl sm:p-6 md:p-8">
              <div className="mb-8 flex flex-wrap justify-center gap-3">
                {filters.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setFilter(item)
                      setIndex(null)
                      setActive(0)
                    }}
                    className={`tap-gold rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-300 ${
                      filter === item ? 'silver-glow scale-105 bg-gradient-to-r from-gold to-gold-light text-dark shadow-[0_0_20px_rgba(217,177,92,0.3)]' : 'border border-gold/20 bg-white/5 text-cream/70 backdrop-blur hover:border-gold/40 hover:bg-white/10 hover:text-gold-light'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex h-[420px] items-center justify-center text-gold md:h-[560px]">
                  <p className="animate-pulse font-bold">Carregando galeria...</p>
                </div>
              ) : images.length === 0 ? (
                <div className="flex h-[420px] items-center justify-center text-cream/50 md:h-[560px]">
                  <p>Nenhuma imagem encontrada nesta categoria.</p>
                </div>
              ) : activeImage && (
                <div className="gallery-slider">
                  <div className="flex items-center gap-4 md:gap-6">
                    <button
                      type="button"
                      onClick={() => move(-1)}
                      className="gallery-slider-arrow tap-gold grid size-12 shrink-0 place-items-center rounded-full border border-gold/20 bg-white/5 text-xl text-gold-light backdrop-blur-md transition-all hover:scale-110 hover:border-gold/50 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(217,177,92,0.2)] md:size-14"
                      aria-label="Imagem anterior"
                    >
                      <FiChevronLeft />
                    </button>

                    <button type="button" onClick={() => setIndex(active)} className="gallery-slider-photo tap-gold group relative min-w-0 flex-1 overflow-hidden rounded-[1.5rem] text-left shadow-2xl">
                      <img src={activeImage.src} alt={activeImage.alt} loading="lazy" className="h-[420px] w-full object-cover transition-transform duration-700 group-hover:scale-105 md:h-[560px]" />
                      <div className="absolute inset-0 bg-black/0 transition-all duration-500 group-hover:bg-black/30 group-hover:backdrop-blur-[2px]"></div>
                      <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                        <div className="flex size-16 items-center justify-center rounded-full bg-gold/90 text-2xl text-dark shadow-[0_0_30px_rgba(217,177,92,0.5)]">
                          <FiZoomIn />
                        </div>
                      </span>
                      <span className="absolute bottom-5 left-5 rounded-full border border-white/10 bg-black/40 px-5 py-2 text-xs font-bold uppercase tracking-wider text-cream backdrop-blur-md">
                        {activeImage.category}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => move(1)}
                      className="gallery-slider-arrow tap-gold grid size-12 shrink-0 place-items-center rounded-full border border-gold/20 bg-white/5 text-xl text-gold-light backdrop-blur-md transition-all hover:scale-110 hover:border-gold/50 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(217,177,92,0.2)] md:size-14"
                      aria-label="Proxima imagem"
                    >
                      <FiChevronRight />
                    </button>
                  </div>

                  <div className="mt-8 flex items-center justify-center gap-2.5">
                    {images.map((image, imageIndex) => (
                      <button
                        key={image.id || image.src}
                        type="button"
                        onClick={() => setActive(imageIndex)}
                        className={`h-2.5 rounded-full transition-all duration-300 ${active === imageIndex ? 'w-10 bg-gradient-to-r from-gold to-gold-light shadow-[0_0_15px_rgba(217,177,92,0.5)]' : 'w-2.5 bg-white/20 hover:scale-110 hover:bg-gold/50'}`}
                        aria-label={`Ir para imagem ${imageIndex + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
      <GalleryModal images={images} index={index} setIndex={setIndex} onClose={() => setIndex(null)} />
    </section>
  )
}
