import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'

export default function GalleryModal({ images, index, setIndex, onClose }) {
  if (index === null) return null
  const image = images[index]
  const move = (direction) => setIndex((index + direction + images.length) % images.length)

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/86 p-4 backdrop-blur-sm">
      <button className="tap-gold absolute right-5 top-5 rounded-full bg-white/10 p-3 text-cream" onClick={onClose} aria-label="Fechar galeria">
        <FiX />
      </button>
      <button className="tap-gold absolute left-4 rounded-full bg-white/10 p-3 text-cream sm:left-5" onClick={() => move(-1)} aria-label="Foto anterior">
        <FiChevronLeft />
      </button>
      <img src={image.src} alt={image.alt} className="max-h-[82vh] max-w-[86vw] rounded-lg object-contain" />
      <button className="tap-gold absolute right-4 rounded-full bg-white/10 p-3 text-cream sm:right-5" onClick={() => move(1)} aria-label="Próxima foto">
        <FiChevronRight />
      </button>
    </div>
  )
}
