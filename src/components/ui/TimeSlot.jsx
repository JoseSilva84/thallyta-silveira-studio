export default function TimeSlot({ time, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap-gold h-12 rounded-md border text-sm font-bold ${
        selected
          ? 'silver-glow border-gold bg-gold text-dark'
          : 'border-dark-border bg-white/10 text-cream backdrop-blur hover:border-gold hover:text-gold-light'
      }`}
    >
      {time}
    </button>
  )
}
