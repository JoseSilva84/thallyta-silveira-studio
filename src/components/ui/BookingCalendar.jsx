import { addDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRef } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

export default function BookingCalendar({ selectedDate, onSelect }) {
  const days = Array.from({ length: 14 }, (_, index) => addDays(new Date(), index))
  const scrollRef = useRef(null)

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 250
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <div className="relative group">
      {/* Scroll Left Button */}
      <button 
        onClick={() => scroll('left')} 
        className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gold/30 bg-dark/95 text-gold-light opacity-0 shadow-lg backdrop-blur-md transition-all hover:bg-gold hover:text-dark group-hover:opacity-100 sm:-left-4"
        aria-label="Anterior"
      >
        <FiChevronLeft className="size-5" />
      </button>

      {/* Scroll Container with added padding (py-6, px-2) to avoid cutting the box-shadow */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth py-6 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((day) => {
          const iso = format(day, 'yyyy-MM-dd')
          const active = selectedDate === iso
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={`tap-gold group min-w-[6.5rem] shrink-0 rounded-[1.25rem] border p-4 text-center transition-all duration-300 sm:min-w-[7.5rem] ${
                active ? 'silver-glow scale-105 border-gold bg-gradient-to-br from-gold to-gold-light text-dark shadow-[0_0_20px_rgba(217,177,92,0.4)]' : 'border-white/10 bg-white/5 text-cream backdrop-blur-md hover:-translate-y-1 hover:border-gold/30 hover:bg-white/10'
              }`}
            >
              <span className="block text-xs font-bold uppercase tracking-wider">{format(day, 'EEE', { locale: ptBR })}</span>
              <span className="my-1 block font-display text-[2rem] font-semibold leading-none">{format(day, 'dd')}</span>
              <span className="block text-[0.65rem] font-semibold uppercase tracking-widest">{format(day, 'MMM', { locale: ptBR })}</span>
            </button>
          )
        })}
      </div>

      {/* Scroll Right Button */}
      <button 
        onClick={() => scroll('right')} 
        className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gold/30 bg-dark/95 text-gold-light opacity-0 shadow-lg backdrop-blur-md transition-all hover:bg-gold hover:text-dark group-hover:opacity-100 sm:-right-4"
        aria-label="Próximo"
      >
        <FiChevronRight className="size-5" />
      </button>
    </div>
  )
}

