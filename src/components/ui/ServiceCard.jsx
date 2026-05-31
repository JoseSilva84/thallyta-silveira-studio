import { FiPlus } from 'react-icons/fi'

export default function ServiceCard({ service, onAdd }) {
  return (
    <article className="service-price-card group gold-border tap-gold flex min-h-36 flex-col justify-between overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-dark-card/60 to-dark-card/90 shadow-2xl transition-all hover:-translate-y-1 hover:shadow-gold/10">
      {service.image && (
        <div className="relative overflow-hidden">
          <img src={service.image} alt={service.name} className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-dark-card/90 to-transparent"></div>
        </div>
      )}
      <div className="flex flex-1 flex-col justify-between p-6 pt-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-gold-light/70">{service.group}</p>
            <div className="ml-4 h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent"></div>
          </div>
          <h3 className="font-display text-[1.35rem] font-semibold leading-tight text-cream transition-colors group-hover:text-gold-light">{service.name}</h3>
          <p className="mt-3 font-display text-xl font-bold tracking-wide text-gold-light">{service.price}</p>
        </div>
        <button
          type="button"
          onClick={() => onAdd(service)}
          className="gold-button mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all group-hover:shadow-[0_0_20px_rgba(217,177,92,0.2)]"
        >
          <FiPlus className="text-lg" aria-hidden="true" />
          Adicionar
        </button>
      </div>
    </article>
  )
}
