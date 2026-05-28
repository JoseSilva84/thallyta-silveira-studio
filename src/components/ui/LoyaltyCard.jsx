export default function LoyaltyCard({ stamps = 4 }) {
  return (
    <div className="gold-border rounded-lg bg-dark-card/80 p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold-light">Cartão fidelidade</p>
          <h3 className="mt-2 font-display text-3xl font-semibold">Studio TS</h3>
        </div>
        <span className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-dark">{stamps}/10</span>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            className={`grid aspect-square place-items-center rounded-full border font-display text-lg font-bold ${
              index < stamps
                ? 'silver-glow border-gold-light bg-black/35 text-gold-light shadow-lg shadow-gold/20'
                : 'border-dark-border bg-white/5 text-cream/35'
            }`}
          >
            TS
          </span>
        ))}
      </div>
      <p className="mt-5 text-sm text-cream/70">{10 - stamps} selos para sua próxima manutenção grátis!</p>
    </div>
  )
}
