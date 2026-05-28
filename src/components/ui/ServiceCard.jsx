import { FiPlus } from 'react-icons/fi'

export default function ServiceCard({ service, onAdd }) {
  return (
    <article className="gold-border tap-gold flex min-h-36 flex-col justify-between rounded-lg bg-dark-card/80 p-5 shadow-2xl shadow-black/20">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold-light/80">{service.group}</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-cream">{service.name}</h3>
        <p className="mt-3 text-sm font-bold text-gold-light">{service.price}</p>
      </div>
      <button
        type="button"
        onClick={() => onAdd(service)}
        className="gold-button mt-5 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold"
      >
        <FiPlus aria-hidden="true" />
        Adicionar ao Agendamento
      </button>
    </article>
  )
}
