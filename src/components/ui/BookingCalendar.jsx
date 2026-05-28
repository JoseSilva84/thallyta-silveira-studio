import { addDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function BookingCalendar({ selectedDate, onSelect }) {
  const days = Array.from({ length: 10 }, (_, index) => addDays(new Date(), index))

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {days.map((day) => {
        const iso = format(day, 'yyyy-MM-dd')
        const active = selectedDate === iso
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(iso)}
            className={`tap-gold min-w-24 rounded-lg border p-3 text-center sm:min-w-28 ${
              active ? 'silver-glow border-gold bg-gold text-dark' : 'border-dark-border bg-white/10 text-cream backdrop-blur hover:border-gold'
            }`}
          >
            <span className="block text-xs font-bold uppercase">{format(day, 'EEE', { locale: ptBR })}</span>
            <span className="block font-display text-3xl font-semibold">{format(day, 'dd')}</span>
            <span className="block text-xs">{format(day, 'MMM', { locale: ptBR })}</span>
          </button>
        )
      })}
    </div>
  )
}
