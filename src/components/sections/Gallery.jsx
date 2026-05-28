import { useMemo, useState } from 'react'
import { FiZoomIn } from 'react-icons/fi'
import { galleryImages } from '../../data/gallery.js'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import GalleryModal from '../ui/GalleryModal.jsx'

const filters = ['Todas', 'Unhas', 'Cabelo', 'Estúdio']

export default function Gallery() {
  const [filter, setFilter] = useState('Todas')
  const [index, setIndex] = useState(null)
  const images = useMemo(() => (filter === 'Todas' ? galleryImages : galleryImages.filter((image) => image.category === filter)), [filter])

  return (
    <section id="galeria" className="py-16 md:py-20">
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
                }}
                className={`tap-gold rounded-full px-4 py-2 text-sm font-bold ${
                  filter === item ? 'silver-glow bg-gold text-dark' : 'border border-gold/30 bg-white/10 text-gold-light backdrop-blur'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {images.map((image, imageIndex) => (
              <button key={image.src} onClick={() => setIndex(imageIndex)} className="tap-gold group relative mb-4 block w-full overflow-hidden rounded-lg text-left">
                <img src={image.src} alt={image.alt} loading="lazy" className="w-full rounded-lg object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 grid place-items-center bg-gold/0 text-3xl text-dark transition group-hover:bg-gold/72">
                  <FiZoomIn className="opacity-0 transition group-hover:opacity-100" />
                </span>
              </button>
            ))}
          </div>
        </Reveal>
      </div>
      <GalleryModal images={images} index={index} setIndex={setIndex} onClose={() => setIndex(null)} />
    </section>
  )
}
