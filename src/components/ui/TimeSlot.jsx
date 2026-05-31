export default function TimeSlot({ time, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap-gold h-14 rounded-xl border text-sm font-bold transition-all duration-300 ${
        selected
          ? 'silver-glow scale-105 border-gold bg-gradient-to-br from-gold to-gold-light text-dark shadow-[0_0_15px_rgba(217,177,92,0.3)]'
          : 'border-white/10 bg-white/5 text-cream backdrop-blur-md hover:-translate-y-1 hover:border-gold/30 hover:bg-white/10 hover:text-gold-light'
      }`}
    >
      {time}
    </button>
  )
}
