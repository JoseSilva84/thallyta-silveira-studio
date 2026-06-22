import { useState } from 'react'
import { FiPlus, FiChevronDown } from 'react-icons/fi'

export default function ServiceCard({ service, onAdd, actionLabel = 'Adicionar' }) {
  const hasVariants = Array.isArray(service.variants) && service.variants.length > 0
  const [selectedVariant, setSelectedVariant] = useState(hasVariants ? service.variants[0] : null)

  const displayPrice = hasVariants ? selectedVariant.price : service.price
  const displayDuration = hasVariants ? selectedVariant.duration : service.duration
  const headlinePrice = hasVariants ? `A partir de ${displayPrice}` : displayPrice

  const handleAdd = () => {
    if (hasVariants) {
      onAdd({
        id: `${service.id}-${selectedVariant.size.toLowerCase()}`,
        name: `${service.name} (${selectedVariant.size})`,
        price: selectedVariant.price,
        duration: selectedVariant.duration,
        calUrl: selectedVariant.calUrl,
        image: service.image,
      })
    } else {
      onAdd(service)
    }
  }

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

          {hasVariants ? (
            <div className="mt-3 space-y-2">
              {/* Price shown dynamically */}
              <p className="font-display text-xl font-bold tracking-wide text-gold-light">{headlinePrice}</p>

              {/* Size selector */}
              <div className="relative">
                <select
                  value={selectedVariant.size}
                  onChange={(e) => {
                    const v = service.variants.find((vv) => vv.size === e.target.value)
                    setSelectedVariant(v)
                  }}
                  className="service-variant-select"
                >
                  {service.variants.map((v) => (
                    <option key={v.size} value={v.size}>
                      {v.label} — {v.price}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gold-light/60 text-base" />
              </div>
            </div>
          ) : (
            <p className="mt-3 font-display text-xl font-bold tracking-wide text-gold-light">{headlinePrice}</p>
          )}
          {displayDuration && (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-cream/45">
              Duração: {displayDuration}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="gold-button mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all group-hover:shadow-[0_0_20px_rgba(217,177,92,0.2)]"
        >
          <FiPlus className="text-lg" aria-hidden="true" />
          {actionLabel}
        </button>
      </div>
    </article>
  )
}
