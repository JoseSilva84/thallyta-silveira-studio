import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { serviceGroups } from '../../data/services.js'
import { useBooking } from '../../context/BookingContext.jsx'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import ServiceCard from '../ui/ServiceCard.jsx'
import Booking from './Booking.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const PREFERRED_SLOT_STORAGE_KEY = 'thallytaPreferredScheduleSlot'

const readPreferredSlot = () => {
  try {
    const value = window.localStorage?.getItem(PREFERRED_SLOT_STORAGE_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const clearPreferredSlot = () => {
  window.localStorage?.removeItem(PREFERRED_SLOT_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('booking:slot-selected', { detail: null }))
}

const getErrorMessage = (error, fallback = 'Ocorreu um erro. Tente novamente.') => {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (typeof error.message === 'string' && error.message && error.message !== '[object Object]') return error.message
  if (typeof error.error === 'string') return error.error
  return fallback
}

const isSlotAvailableForServices = async (services, preferredSlot) => {
  if (!services.length || !preferredSlot?.start) return true

  const params = new URLSearchParams({ days: '30', serviceIds: services.map((service) => service.id).join(',') })
  const res = await fetch(`${API}/bookings/public-agenda?${params.toString()}`)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) throw new Error(getErrorMessage(data, 'Nao foi possivel validar esse horario.'))

  const selectedStart = new Date(preferredSlot.start).getTime()
  return (data.agendaDays || []).some((day) =>
    (day.availableSlots || []).some((slot) => new Date(slot.start).getTime() === selectedStart),
  )
}

export default function Services() {
  const [active, setActive] = useState(serviceGroups[0].id)
  const [validatingServiceId, setValidatingServiceId] = useState('')
  const [askAnotherService, setAskAnotherService] = useState(false)
  const { addService, removeService, selectedServices } = useBooking()
  const group = serviceGroups.find((item) => item.id === active)
  const handleAddService = async (service) => {
    if (selectedServices.some((item) => item.id === service.id)) {
      setAskAnotherService(true)
      return
    }
    const preferredSlot = readPreferredSlot()

    try {
      setValidatingServiceId(service.id)
      const canUseSelectedSlot = await isSlotAvailableForServices([...selectedServices, service], preferredSlot)

      if (!canUseSelectedSlot) {
        clearPreferredSlot()
        toast.warn('Esse horário nao comporta a duração desse serviço. Escolha outro dia ou horario na agenda.')
        document.getElementById('agenda')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }

      addService(service)
      setAskAnotherService(true)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Nao foi possivel validar esse horario.'))
    } finally {
      setValidatingServiceId('')
    }
  }

  const finishServiceSelection = () => {
    setAskAnotherService(false)
    window.setTimeout(() => {
      document.getElementById('servicos-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  return (
    <section id="servicos" className="premium-section py-6 md:py-8 lg:py-14">
      <div className="section-shell">
        <SectionTitle eyebrow="Serviços" title="Escolha seu próximo cuidado" />
        <Reveal>
          <div className="relative">
            <div className="absolute -inset-4 z-0 rounded-[3rem] bg-gradient-to-b from-gold/10 to-transparent opacity-50 blur-2xl"></div>
            <div id="servicos-cards" className="gold-border relative z-10 scroll-mt-8 rounded-[2.5rem] bg-black/40 p-5 backdrop-blur-xl sm:p-8 md:scroll-mt-20 lg:p-10">
              <div className="mb-10 flex flex-wrap justify-center gap-3">
                {serviceGroups.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    className={`tap-gold rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-300 ${
                      active === item.id ? 'silver-glow scale-105 bg-gradient-to-r from-gold to-gold-light text-dark shadow-[0_0_20px_rgba(217,177,92,0.3)]' : 'border border-gold/20 bg-white/5 text-cream/70 backdrop-blur hover:border-gold/40 hover:bg-white/10 hover:text-gold-light'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="grid min-w-0 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={{ ...service, group: group.label }}
                    onAdd={handleAddService}
                    actionLabel={validatingServiceId === service.id ? 'Verificando...' : 'Escolher'}
                  />
                ))}
              </div>
              {selectedServices.length > 0 && (
                <div className="mt-8 rounded-2xl border border-gold/20 bg-gold/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gold-light/75">Serviços escolhidos</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedServices.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => removeService(service.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-black/25 px-3 py-2 text-sm font-semibold text-cream transition-colors hover:bg-red-500/10 hover:text-red-100"
                        aria-label={`Remover ${service.name}`}
                      >
                        {service.name} <FiX />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Booking embedded />
            </div>
          </div>
        </Reveal>
        {askAnotherService && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="add-another-service-title">
            <div className="w-full max-w-md rounded-[2rem] border border-gold/30 bg-dark-card p-6 text-center shadow-2xl">
              <h3 id="add-another-service-title" className="font-display text-3xl text-gold-light">Deseja adicionar mais um serviço?</h3>
              <p className="mt-2 text-sm text-cream/65">Você pode escolher quantos serviços quiser para este mesmo horário.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => setAskAnotherService(false)} className="rounded-xl border border-gold/30 px-5 py-3 font-bold text-gold-light transition-colors hover:bg-gold/10">
                  Sim
                </button>
                <button type="button" onClick={finishServiceSelection} className="gold-button rounded-xl px-5 py-3 font-bold">
                  Não, ir ao resumo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
