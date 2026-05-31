import { addDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function BookingCalendar({ selectedDate, onSelect }) {
  const days = Array.from({ length: 10 }, (_, index) => addDays(new Date(), index))

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {days.map((day) => {
        const iso = format(day, 'yyyy-MM-dd')
        const active = selectedDate === iso
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(iso)}
            className={`tap-gold group min-w-[6.5rem] rounded-[1.25rem] border p-4 text-center transition-all duration-300 sm:min-w-[7.5rem] ${
              active ? 'silver-glow scale-105 border-gold bg-gradient-to-br from-gold to-gold-light text-dark shadow-[0_0_20px_rgba(217,177,92,0.3)]' : 'border-white/10 bg-white/5 text-cream backdrop-blur-md hover:-translate-y-1 hover:border-gold/30 hover:bg-white/10'
            }`}
          >
            <span className="block text-xs font-bold uppercase tracking-wider">{format(day, 'EEE', { locale: ptBR })}</span>
            <span className="my-1 block font-display text-[2rem] font-semibold leading-none">{format(day, 'dd')}</span>
            <span className="block text-[0.65rem] font-semibold uppercase tracking-widest">{format(day, 'MMM', { locale: ptBR })}</span>
          </button>
        )
      })}
    </div>
  )
}
