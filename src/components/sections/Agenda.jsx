import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiClock, FiList, FiRefreshCw } from 'react-icons/fi'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const STUDIO_TIME_ZONE = 'America/Fortaleza'

export default function Agenda() {
  const [view, setView] = useState('calendar')
  const [bookings, setBookings] = useState([])
  const [availabilityDays, setAvailabilityDays] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)

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

  return (
    <section id="agenda" className="premium-section py-16 md:py-20">
      <div className="section-shell">
        <SectionTitle
          eyebrow="Agenda"
          title="Consulte os horarios disponiveis"
          text="Veja os horarios livres e ocupados antes de escolher o servico."
        />

        <Reveal>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-2 text-sm text-cream/65 sm:grid-cols-2 lg:flex lg:flex-wrap">
                <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <FiClock className="text-gold" /> Atendimento a partir das 09h30
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <FiClock className="text-gold" /> Pausa: 13h00 as 14h30
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="grid grid-cols-2 rounded-lg border border-white/10 bg-black/25 p-1">
                  <button
                    type="button"
                    onClick={() => setView('calendar')}
                    className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${view === 'calendar' ? 'bg-gold text-dark' : 'text-cream/70 hover:text-cream'}`}
                  >
                    <FiCalendar /> Calendario
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${view === 'list' ? 'bg-gold text-dark' : 'text-cream/70 hover:text-cream'}`}
                  >
                    <FiList /> Lista
                  </button>
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
            </div>

            {error && (
              <div className="mt-5 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <div className="mt-6">
              {view === 'calendar' ? (
                <AgendaCalendar days={days} loading={loading} onOpenDay={setSelectedDay} />
              ) : (
                <AgendaList days={days} loading={loading} />
              )}
            </div>
          </div>
        </Reveal>
      </div>
      {selectedDay && (
        <AgendaDayModal day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </section>
  )
}

function AgendaCalendar({ days, loading, onOpenDay }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => (
        <div
          key={day.key}
          className="group relative min-h-[188px] rounded-xl border border-white/10 bg-black/25 p-4 transition-colors hover:border-gold/35 hover:bg-black/35"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">{formatWeekday(day.date)}</p>
              <p className="mt-1 font-display text-xl text-cream">{formatDate(day.date)}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider ${getDayBadgeClass(day)}`}>
              {getDayBadgeLabel(day, true)}
            </span>
          </div>

          <div className="mt-4">
            {loading ? (
              <p className="text-sm text-cream/45">Carregando...</p>
            ) : !day.isBusinessDay ? (
              <p className="text-sm text-cream/45">Studio fechado.</p>
            ) : (
              <>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-200/80">Disponiveis</p>
                <AvailableSlots slots={day.availableSlots} compact onOpenMore={() => onOpenDay(day)} />
              </>
            )}
          </div>

          {day.bookings.length > 0 && (
            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-100/80">Ocupados</p>
              <div className="space-y-2">
                {day.bookings.slice(0, 2).map((booking) => (
                  <AgendaTime key={booking.id} booking={booking} />
                ))}
                {day.bookings.length > 2 && (
                  <p className="text-xs font-semibold text-gold-light/70">+{day.bookings.length - 2} horario(s)</p>
                )}
              </div>
            </div>
          )}

          {(day.bookings.length > 0 || day.availableSlots.length > 6) && (
            <button
              type="button"
              onClick={() => onOpenDay(day)}
              className="mt-4 w-full rounded-lg border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gold-light transition-colors hover:bg-gold/20"
            >
              Ver todos os horarios
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function AgendaList({ days, loading }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {days.map((day) => (
        <div key={day.key} className="rounded-xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">{formatWeekday(day.date)}</p>
              <p className="mt-1 font-display text-xl text-cream">{formatLongDate(day.date)}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider ${getDayBadgeClass(day)}`}>
              {getDayBadgeLabel(day)}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {loading ? (
              <p className="text-sm text-cream/45">Carregando...</p>
            ) : !day.isBusinessDay ? (
              <p className="text-sm text-cream/45">Studio fechado.</p>
            ) : (
              <>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-200/80">Disponiveis</p>
                  <AvailableSlots slots={day.availableSlots} />
                </div>
                {day.bookings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-100/80">Ocupados</p>
                    {day.bookings.map((booking) => (
                      <AgendaTime key={booking.id} booking={booking} showService />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function AvailableSlots({ slots, compact = false, onOpenMore }) {
  if (!slots?.length) {
    return <p className="text-sm text-cream/45">Sem horarios livres.</p>
  }

  const visibleSlots = compact ? slots.slice(0, 6) : slots

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleSlots.map((slot) => (
        <span key={slot.start || slot.time} className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-100">
          {slot.time}
        </span>
      ))}
      {compact && slots.length > visibleSlots.length && onOpenMore && (
        <button
          type="button"
          onClick={onOpenMore}
          className="rounded-md border border-gold/20 bg-gold/10 px-2 py-1 text-xs font-semibold text-gold-light transition-colors hover:bg-gold/20"
          aria-label={`Ver mais ${slots.length - visibleSlots.length} horarios disponiveis`}
        >
          +{slots.length - visibleSlots.length}
        </button>
      )}
    </div>
  )
}

function AgendaDayModal({ day, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agenda-day-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gold/30 bg-dark-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">{formatWeekday(day.date)}</p>
            <h3 id="agenda-day-modal-title" className="mt-1 font-display text-3xl text-gold-light">
              {formatLongDate(day.date)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-cream/70 transition-colors hover:border-gold/30 hover:text-gold-light"
          >
            Fechar
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-200/80">Horarios disponiveis</p>
            {day.isBusinessDay ? (
              <AvailableSlots slots={day.availableSlots} />
            ) : (
              <p className="text-sm text-cream/55">Studio fechado.</p>
            )}
          </section>

          {day.bookings.length > 0 && (
            <section>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-100/80">Horarios ocupados</p>
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/25 p-4">
                {day.bookings.map((booking) => (
                  <AgendaTime key={booking.id} booking={booking} showService />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function AgendaTime({ booking, showService = false }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-cream/75">
      <FiClock className="shrink-0 text-gold" />
      <span className="shrink-0">
        {formatTime(booking.scheduledAt)}{booking.endTime ? ` - ${formatTime(booking.endTime)}` : ''}
      </span>
      {showService && <span className="truncate text-cream/45">- {booking.service}</span>}
    </div>
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

const getDayBadgeLabel = (day, compact = false) => {
  if (!day.isBusinessDay) return 'Fechado'
  if (day.availableSlots.length) return compact ? `${day.availableSlots.length}` : `${day.availableSlots.length} livre(s)`
  return 'Lotado'
}

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: STUDIO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const toDateKey = (date) => dateKeyFormatter.format(date)

const formatDate = (date) => date.toLocaleDateString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  day: '2-digit',
  month: 'short',
})

const formatLongDate = (date) => date.toLocaleDateString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  day: '2-digit',
  month: 'long',
})

const formatWeekday = (date) => date.toLocaleDateString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  weekday: 'short',
})

const formatTime = (value) => new Date(value).toLocaleTimeString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

const isBusinessDay = (date) => {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TIME_ZONE,
    weekday: 'short',
  }).format(date)

  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday)
}
