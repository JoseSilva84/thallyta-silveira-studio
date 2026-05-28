import { useEffect } from 'react'
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'

export default function GalleryModal({ images, index, setIndex, onClose }) {
  useEffect(() => {
    if (index === null) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [index, onClose])

  if (index === null) return null
  const image = images[index]
  const move = (direction) => setIndex((index + direction + images.length) % images.length)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/84 p-3 backdrop-blur-md sm:p-6" onClick={onClose}>
      <div className="gallery-modal-layout relative flex max-h-[88vh] max-w-[96vw] items-center justify-center gap-3 sm:gap-5" onClick={(event) => event.stopPropagation()}>
        <button
          className="gallery-arrow tap-gold grid size-12 shrink-0 place-items-center rounded-full border border-gold/45 bg-black/75 text-2xl text-cream shadow-2xl backdrop-blur-md sm:size-14"
          onClick={() => move(-1)}
          aria-label="Foto anterior"
          type="button"
        >
          <FiChevronLeft />
        </button>

        <div className="relative">
          <button
            className="gallery-close tap-gold absolute right-3 top-3 z-[205] grid size-11 place-items-center rounded-full border border-gold/55 bg-black/78 text-xl text-cream shadow-2xl backdrop-blur-md"
            onClick={onClose}
            aria-label="Fechar foto"
            type="button"
          >
            <FiX />
          </button>
          <img src={image.src} alt={image.alt} className="max-h-[88vh] max-w-[78vw] rounded-lg object-contain shadow-2xl sm:max-w-[82vw]" />
        </div>

        <button
          className="gallery-arrow tap-gold grid size-12 shrink-0 place-items-center rounded-full border border-gold/45 bg-black/75 text-2xl text-cream shadow-2xl backdrop-blur-md sm:size-14"
          onClick={() => move(1)}
          aria-label="Proxima foto"
          type="button"
        >
          <FiChevronRight />
        </button>
      </div>
    </div>
  )
}
