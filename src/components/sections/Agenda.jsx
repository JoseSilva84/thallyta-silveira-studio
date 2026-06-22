import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiClock, FiRefreshCw } from 'react-icons/fi'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const STUDIO_TIME_ZONE = 'America/Fortaleza'
const PREFERRED_SLOT_STORAGE_KEY = 'thallytaPreferredScheduleSlot'

export default function Agenda() {
  const [bookings, setBookings] = useState([])
  const [availabilityDays, setAvailabilityDays] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  const fetchAgenda = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/bookings/public-agenda?days=30`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar agenda.')
      setBookings(Array.isArray(data.bookings) ? data.bookings : [])
      setAvailabilityDays(Array.isArray(data.agendaDays) ? data.agendaDays : [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar agenda.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgenda()
  }, [fetchAgenda])

  useEffect(() => {
    const interval = window.setInterval(fetchAgenda, 30000)
    const handleVisibility = () => {
      if (!document.hidden) fetchAgenda()
    }
    const handleBookingUpdated = () => fetchAgenda()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('booking:updated', handleBookingUpdated)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('booking:updated', handleBookingUpdated)
    }
  }, [fetchAgenda])

  const days = useMemo(() => buildAgendaDays(bookings, availabilityDays), [availabilityDays, bookings])

  useEffect(() => {
    if (selectedDate || !days.length) return
    const firstAvailable = days.find((day) => day.availableSlots.length > 0)
    setSelectedDate((firstAvailable || days[0]).key)
  }, [days, selectedDate])

  const selectedDay = days.find((day) => day.key === selectedDate) || days[0]
  const nextAvailableDay = useMemo(() => {
    if (!selectedDay) return null
    return days.find((day) => day.key !== selectedDay.key && day.availableSlots.length > 0) || null
  }, [days, selectedDay])

  const selectSlot = useCallback((day, slot) => {
    const payload = {
      date: day.key,
      start: slot.start,
      time: slot.time,
    }

    window.localStorage?.setItem(PREFERRED_SLOT_STORAGE_KEY, JSON.stringify(payload))
    window.dispatchEvent(new CustomEvent('booking:slot-selected', { detail: payload }))
    window.history.replaceState(null, '', '#servicos')
    document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <section id="agenda" className="premium-section py-14 md:py-16">
      <div className="section-shell">
        <SectionTitle
          eyebrow="Agenda"
          title="Escolha o melhor dia"
          text="Selecione uma data para ver apenas os horarios disponiveis daquele dia."
        />

        <Reveal>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2 text-sm text-cream/65">
                <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <FiClock className="text-gold" /> 09h30 as 18h
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <FiClock className="text-gold" /> Pausa 13h as 14h30
                </span>
              </div>
              <button
                type="button"
                onClick={fetchAgenda}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/25 px-4 py-2 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                Atualizar
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[0.95fr_1fr]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">
                      {formatMonth(days[0]?.date || new Date())}
                    </p>
                    <h3 className="mt-1 font-display text-2xl text-cream">Datas próximas</h3>
                  </div>
                  <FiCalendar className="text-2xl text-gold-light" />
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-[0.68rem] font-bold uppercase tracking-wider text-cream/35">
                  {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((label, index) => (
                    <span key={`${label}-${index}`}>{label}</span>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-7 gap-2">
                  {days.slice(0, 14).map((day) => (
                    <DateButton
                      key={day.key}
                      day={day}
                      active={selectedDay?.key === day.key}
                      loading={loading}
                      onClick={() => setSelectedDate(day.key)}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gold/20 bg-gradient-to-b from-dark-card/85 to-dark/95 p-5">
                {selectedDay ? (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">
                          {formatWeekday(selectedDay.date)}
                        </p>
                        <h3 className="mt-1 font-display text-3xl text-gold-light">
                          {formatLongDate(selectedDay.date)}
                        </h3>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${getDayBadgeClass(selectedDay)}`}>
                        {getDayBadgeLabel(selectedDay)}
                      </span>
                    </div>

                    <div className="mt-6">
                      {loading ? (
                        <p className="text-sm text-cream/50">Carregando horarios...</p>
                      ) : selectedDay.availableSlots.length > 0 ? (
                        <>
                          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-200/80">
                            Horarios disponiveis
                          </p>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {selectedDay.availableSlots.map((slot) => (
                              <button
                                key={slot.start || slot.time}
                                type="button"
                                onClick={() => selectSlot(selectedDay, slot)}
                                className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-3 text-sm font-bold text-emerald-100 transition-colors hover:bg-emerald-300/20 focus:outline-none focus:ring-2 focus:ring-emerald-200/40"
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-center">
                          <p className="font-display text-2xl text-cream">Sem horarios livres</p>
                          <p className="mt-2 text-sm text-cream/55">
                            Escolha outra data ou avance para o proximo dia disponivel.
                          </p>
                          {nextAvailableDay && (
                            <button
                              type="button"
                              onClick={() => setSelectedDate(nextAvailableDay.key)}
                              className="gold-button mt-4 rounded-xl px-5 py-3 text-sm font-bold"
                            >
                              Proximo dia disponivel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-cream/50">Carregando agenda...</p>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function DateButton({ day, active, loading, onClick }) {
  const isUnavailable = !day.isBusinessDay || day.availableSlots.length === 0

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`min-h-[4.25rem] rounded-xl border p-2 transition-colors disabled:cursor-wait disabled:opacity-60 ${
        active
          ? 'border-gold bg-gold text-dark shadow-[0_0_18px_rgba(217,177,92,0.25)]'
          : isUnavailable
            ? 'border-white/8 bg-white/[0.03] text-cream/35 hover:border-white/15'
            : 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20'
      }`}
      aria-pressed={active}
    >
      <span className="block text-[0.62rem] font-bold uppercase tracking-wider">{formatShortWeekday(day.date)}</span>
      <span className="mt-1 block font-display text-xl leading-none">{formatDayNumber(day.date)}</span>
      <span className="mt-1 block text-[0.62rem] font-bold uppercase tracking-wider">
        {day.availableSlots.length > 0 ? `${day.availableSlots.length} vagas` : day.isBusinessDay ? 'lotado' : 'fechado'}
      </span>
    </button>
  )
}

function buildAgendaDays(bookings, availabilityDays) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)
    const key = toDateKey(date)
    const dayBookings = bookings
      .filter((booking) => toDateKey(new Date(booking.scheduledAt)) === key)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    const availability = availabilityDays.find((day) => day.date === key)

    return {
      key,
      date,
      bookings: dayBookings,
      isBusinessDay: availability?.isBusinessDay ?? isBusinessDay(date),
      availableSlots: availability?.availableSlots || [],
    }
  })
}

const getDayBadgeClass = (day) => {
  if (!day.isBusinessDay) return 'bg-white/10 text-cream/55'
  return day.availableSlots.length ? 'bg-emerald-300/10 text-emerald-100' : 'bg-amber-300/10 text-amber-100'
}

const getDayBadgeLabel = (day) => {
  if (!day.isBusinessDay) return 'Fechado'
  if (day.availableSlots.length) return `${day.availableSlots.length} horario(s)`
  return 'Lotado'
}

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: STUDIO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const toDateKey = (date) => dateKeyFormatter.format(date)

const formatMonth = (date) => date.toLocaleDateString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  month: 'long',
  year: 'numeric',
})

const formatDayNumber = (date) => date.toLocaleDateString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  day: '2-digit',
})

const formatLongDate = (date) => date.toLocaleDateString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  day: '2-digit',
  month: 'long',
})

const formatShortWeekday = (date) => date.toLocaleDateString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  weekday: 'short',
}).replace('.', '')

const formatWeekday = (date) => date.toLocaleDateString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  weekday: 'long',
})

const isBusinessDay = (date) => {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TIME_ZONE,
    weekday: 'short',
  }).format(date)

  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday)
}
