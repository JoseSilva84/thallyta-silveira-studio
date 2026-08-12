import { useEffect, useMemo, useState } from 'react'
import { FiX, FiCalendar, FiTag } from 'react-icons/fi'
import { allServices } from '../../data/services.js'
import { useBooking } from '../../context/BookingContext.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const PROMOTION_MODAL_SESSION_KEY = 'thallytaPromotionModalShown'

const formatPeriod = (promotion) => {
  if (!promotion?.startsAt || !promotion?.endsAt) return ''
  const start = new Date(promotion.startsAt).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit' })
  const end = new Date(promotion.endsAt).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit' })
  return `Promoção válida de ${start} até ${end}`
}

const buildPromotionalService = (item) => {
  const service = allServices.find((entry) => entry.id === item.serviceId)
  if (!service) return null
  return {
    ...service,
    price: item.promotionalPriceLabel,
    regularPrice: item.regularPriceLabel,
    promotionId: item.promotionId,
    promotionItemId: item.id,
    promotionPrice: item.promotionalPrice,
  }
}

export default function PromotionModal() {
  const { addService, clearServices } = useBooking()
  const [promotions, setPromotions] = useState([])
  const [open, setOpen] = useState(false)
  const [selectedPromotionId, setSelectedPromotionId] = useState('')
  const [selectedItemId, setSelectedItemId] = useState('')

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams(window.location.search)
    const requestedPromotionId = params.get('promocao') || ''
    const requestedItemId = params.get('itemPromocao') || ''

    const loadPromotions = async () => {
      try {
        const res = await fetch(`${API}/promotions/active`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Erro ao buscar promoções.')
        if (cancelled) return

        const activePromotions = Array.isArray(data.promotions) ? data.promotions : []
        setPromotions(activePromotions)

        const requestedPromotion = activePromotions.find((item) => item.id === requestedPromotionId)
        const fallbackPromotion = requestedPromotion || activePromotions[0]
        const fallbackItem = fallbackPromotion?.items?.find((item) => item.id === requestedItemId) || fallbackPromotion?.items?.[0]

        if (!fallbackPromotion || !fallbackItem) return

        setSelectedPromotionId(fallbackPromotion.id)
        setSelectedItemId(fallbackItem.id)

        const alreadyShown = window.sessionStorage?.getItem(PROMOTION_MODAL_SESSION_KEY)
        if (requestedPromotionId || !alreadyShown) {
          setOpen(true)
          window.sessionStorage?.setItem(PROMOTION_MODAL_SESSION_KEY, fallbackPromotion.id)
        }
      } catch (error) {
        console.error('Erro ao carregar modal de promoção:', error)
      }
    }

    loadPromotions()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedPromotion = useMemo(
    () => promotions.find((promotion) => promotion.id === selectedPromotionId) || promotions[0],
    [promotions, selectedPromotionId],
  )
  const selectedItem = useMemo(
    () => selectedPromotion?.items?.find((item) => item.id === selectedItemId) || selectedPromotion?.items?.[0],
    [selectedItemId, selectedPromotion],
  )

  const handleSchedule = () => {
    const service = buildPromotionalService(selectedItem)
    if (!service) return

    clearServices()
    addService(service)
    setOpen(false)
    requestAnimationFrame(() => {
      document.getElementById('agenda')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  if (!open || !selectedPromotion || !selectedItem) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-gold/30 bg-dark-card shadow-2xl shadow-black/70">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-black/55 p-2 text-cream/70 backdrop-blur transition hover:border-gold/40 hover:text-gold-light"
          aria-label="Fechar promoção"
        >
          <FiX />
        </button>

        {selectedPromotion.imageUrl && (
          <button type="button" onClick={handleSchedule} className="block w-full overflow-hidden text-left">
            <img src={selectedPromotion.imageUrl} alt={selectedPromotion.title} className="h-64 w-full object-cover" />
          </button>
        )}

        <div className="space-y-5 p-6 sm:p-8">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gold-light/70">
              <FiTag /> Promoção
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-cream">{selectedPromotion.title}</h2>
            <p className="mt-2 text-sm leading-6 text-cream/65">{selectedPromotion.description}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold-light/70">{formatPeriod(selectedPromotion)}</p>
          </div>

          <div className="grid gap-2">
            {selectedPromotion.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  selectedItem.id === item.id
                    ? 'border-gold bg-gold/10'
                    : 'border-white/10 bg-white/[0.04] hover:border-gold/30'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-cream">{item.serviceName}</span>
                  <span className="mt-1 block text-xs text-cream/45">
                    <span className="line-through">{item.regularPriceLabel}</span>
                    <span className="ml-2 font-bold text-gold-light">{item.promotionalPriceLabel}</span>
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${selectedItem.id === item.id ? 'bg-gold text-dark' : 'bg-white/10 text-cream/50'}`}>
                  {selectedItem.id === item.id ? 'Escolhido' : 'Escolher'}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSchedule}
            className="gold-button flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-bold uppercase tracking-wider"
          >
            <FiCalendar /> Agende aqui
          </button>
        </div>
      </div>
    </div>
  )
}
