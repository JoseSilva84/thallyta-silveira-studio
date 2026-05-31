export default function LoyaltyCard({ stamps = 4, preview = false }) {
  return (
    <div className="loyalty-preview-card relative overflow-hidden rounded-[2.5rem] border border-gold/20 bg-gradient-to-b from-dark-card/90 to-dark/95 p-8 shadow-2xl backdrop-blur-md sm:p-10">
      <div className="absolute -inset-10 z-0 bg-gradient-to-tr from-gold/5 via-transparent to-gold/10 opacity-60 blur-3xl"></div>
      
      <div className="relative z-10 mb-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold-light/80">Cartão fidelidade</p>
        </div>
        <span className="rounded-full bg-gradient-to-r from-gold to-gold-light px-5 py-2 text-sm font-bold text-dark shadow-[0_0_15px_rgba(217,177,92,0.3)]">{stamps}/10</span>
      </div>
      <div className="relative z-10 grid grid-cols-5 gap-3 sm:gap-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            className={`grid aspect-square place-items-center rounded-full font-display text-xl font-bold transition-all duration-500 sm:text-2xl ${
              index < stamps
                ? 'silver-glow scale-105 border border-gold/40 bg-gradient-to-br from-gold to-gold-light text-dark shadow-[0_0_20px_rgba(217,177,92,0.4)]'
                : 'border border-white/10 bg-black/40 text-cream/20 shadow-inner'
            }`}
          >
            TS
          </span>
        ))}
      </div>
      <p className="relative z-10 mt-10 text-center font-display text-lg text-cream/90">{10 - stamps} selos para sua próxima manutenção grátis!</p>
      {preview && <p className="relative z-10 mt-3 text-center text-xs font-semibold uppercase tracking-wider text-cream/45">Exemplo visual</p>}
    </div>
  )
}
