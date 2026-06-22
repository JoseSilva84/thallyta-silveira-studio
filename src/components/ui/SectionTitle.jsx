export default function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="mx-auto mb-7 max-w-3xl text-center md:mb-8 lg:mb-10">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.32em] text-gold-light md:mb-3">{eyebrow}</p>
      <h2 className="font-display text-4xl font-semibold text-cream md:text-5xl lg:text-6xl">{title}</h2>
      {text && <p className="mt-3 text-sm leading-7 text-cream/70 md:mt-4 md:text-base">{text}</p>}
    </div>
  )
}
