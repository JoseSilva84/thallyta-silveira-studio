export default function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-gold-light">{eyebrow}</p>
      <h2 className="font-display text-4xl font-semibold text-cream md:text-6xl">{title}</h2>
      {text && <p className="mt-4 text-sm leading-7 text-cream/70 md:text-base">{text}</p>}
    </div>
  )
}
