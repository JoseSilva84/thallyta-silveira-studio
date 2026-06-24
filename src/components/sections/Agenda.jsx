import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiCalendar, FiChevronLeft, FiChevronRight, FiClock, FiRefreshCw } from 'react-icons/fi'
import { useBooking } from '../../context/BookingContext.jsx'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const STUDIO_TIME_ZONE = 'America/Fortaleza'
const PREFERRED_SLOT_STORAGE_KEY = 'thallytaPreferredScheduleSlot'
const PENDING_PAYMENT_STORAGE_KEY = 'thallytaPendingBookingPaymentId'
const MOBILE_DATE_PAGE_SIZE = 3
const DESKTOP_DATE_PAGE_SIZE = 14

const getServiceCardsScrollTop = (element) => {
  if (!element) return 0
  const headerOffset = window.matchMedia('(min-width: 1024px)').matches
    ? 92
    : window.matchMedia('(min-width: 768px)').matches
      ? 72
      : 24

  return Math.max(element.getBoundingClientRect().top + window.scrollY - headerOffset, 0)
}

const isMobileViewport = () => window.matchMedia('(max-width: 639px)').matches

const hasPendingPaidBooking = () => {
  try {
    return Boolean(window.localStorage?.getItem(PENDING_PAYMENT_STORAGE_KEY))
  } catch {
    return false
  }
}

export default function Agenda() {
  const { selectedServices } = useBooking()
  const [bookings, setBookings] = useState([])
  const [availabilityDays, setAvailabilityDays] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [mobileDateStart, setMobileDateStart] = useState(0)
  const [desktopDateStart, setDesktopDateStart] = useState(0)
  const timeCardRef = useRef(null)
  const selectedService = selectedServices[0] || null

  const fetchAgenda = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ days: '30' })
      if (selectedService?.id) params.set('serviceId', selectedService.id)
      const res = await fetch(`${API}/bookings/public-agenda?${params.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar agenda.')
      setBookings(Array.isArray(data.bookings) ? data.bookings : [])
      setAvailabilityDays(Array.isArray(data.agendaDays) ? data.agendaDays : [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar agenda.')
    } finally {
      setLoading(false)
    }
  }, [selectedService?.id])

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

  useEffect(() => {
    if (!selectedDate || !days.length) return
    const selectedIndex = days.findIndex((day) => day.key === selectedDate)
    if (selectedIndex < 0) return
    if (selectedIndex < mobileDateStart || selectedIndex >= mobileDateStart + MOBILE_DATE_PAGE_SIZE) {
      setMobileDateStart(Math.floor(selectedIndex / MOBILE_DATE_PAGE_SIZE) * MOBILE_DATE_PAGE_SIZE)
    }
    if (selectedIndex < desktopDateStart || selectedIndex >= desktopDateStart + DESKTOP_DATE_PAGE_SIZE) {
      setDesktopDateStart(Math.floor(selectedIndex / DESKTOP_DATE_PAGE_SIZE) * DESKTOP_DATE_PAGE_SIZE)
    }
  }, [days, desktopDateStart, mobileDateStart, selectedDate])

  const selectedDay = days.find((day) => day.key === selectedDate) || days[0]
  const mobileDateDays = days.slice(mobileDateStart, mobileDateStart + MOBILE_DATE_PAGE_SIZE)
  const desktopDateDays = days.slice(desktopDateStart, desktopDateStart + DESKTOP_DATE_PAGE_SIZE)
  const canShowPreviousDates = mobileDateStart > 0
  const canShowNextDates = mobileDateStart + MOBILE_DATE_PAGE_SIZE < days.length
  const canShowPreviousDesktopDates = desktopDateStart > 0
  const canShowNextDesktopDates = desktopDateStart + DESKTOP_DATE_PAGE_SIZE < days.length
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

    if (hasPendingPaidBooking() || selectedServices.length > 0) {
      window.history.replaceState(null, '', '#servicos-checkout')
      window.setTimeout(() => {
        const checkout = document.getElementById('servicos-checkout')
        if (checkout) {
          window.scrollTo({ top: getServiceCardsScrollTop(checkout), behavior: 'smooth' })
        }
      }, 80)
      return
    }

    window.history.replaceState(null, '', '#servicos')
    const serviceCards = document.getElementById('servicos-cards') || document.getElementById('servicos')
    if (serviceCards) {
      window.scrollTo({ top: getServiceCardsScrollTop(serviceCards), behavior: 'smooth' })
    }
  }, [selectedServices])

  const selectDate = useCallback((dateKey) => {
    setSelectedDate(dateKey)

    if (!isMobileViewport()) return

    window.setTimeout(() => {
      if (timeCardRef.current) {
        window.scrollTo({ top: getServiceCardsScrollTop(timeCardRef.current), behavior: 'smooth' })
      }
    }, 80)
  }, [])

  const showDateGroup = useCallback((direction, pageSize, dateStart, setDateStart) => {
    const maxStart = Math.max(days.length - pageSize, 0)
    const next = Math.min(Math.max(dateStart + direction * pageSize, 0), maxStart)
    const nextGroup = days.slice(next, next + pageSize)
    const nextSelectedDay = nextGroup.find((day) => day.availableSlots.length > 0) || nextGroup[0]

    setDateStart(next)
    if (nextSelectedDay) setSelectedDate(nextSelectedDay.key)
  }, [days])

  return (
    <section id="agenda" className="premium-section py-6 md:py-8 lg:py-12">
      <div className="section-shell">
        <SectionTitle
          eyebrow="Agenda"
          title="Escolha o melhor dia"
        />

        <Reveal>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-3 sm:p-4 md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="grid grid-cols-2 gap-2 text-[0.78rem] text-cream/65 sm:flex sm:flex-wrap sm:text-sm">
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
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">
                      {formatMonth(days[0]?.date || new Date())}
                    </p>
                    <h3 className="mt-1 font-display text-2xl text-cream">Datas próximas</h3>
                  </div>
                  <FiCalendar className="text-2xl text-gold-light" />
                </div>

                <div className="mt-3 sm:hidden">
                  <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-stretch gap-2">
                    <button
                      type="button"
                      onClick={() => showDateGroup(-1, MOBILE_DATE_PAGE_SIZE, mobileDateStart, setMobileDateStart)}
                      disabled={!canShowPreviousDates}
                      className="inline-flex h-full min-h-[4.35rem] items-center justify-center rounded-xl border border-gold/25 bg-black/25 text-gold-light transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Ver datas anteriores"
                    >
                      <FiChevronLeft />
                    </button>

                    <div className="grid min-w-0 grid-cols-3 gap-2">
                      {mobileDateDays.map((day) => (
                        <DateButton
                          key={day.key}
                          day={day}
                          active={selectedDay?.key === day.key}
                          loading={loading}
                          compact
                          onClick={() => selectDate(day.key)}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => showDateGroup(1, MOBILE_DATE_PAGE_SIZE, mobileDateStart, setMobileDateStart)}
                      disabled={!canShowNextDates}
                      className="inline-flex h-full min-h-[4.35rem] items-center justify-center rounded-xl border border-gold/25 bg-black/25 text-gold-light transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Ver mais datas"
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                </div>

                <div className="mt-3 hidden sm:block">
                  <div className="grid min-w-0 grid-cols-7 gap-2">
                    {desktopDateDays.map((day) => (
                      <DateButton
                        key={day.key}
                        day={day}
                        active={selectedDay?.key === day.key}
                        loading={loading}
                        onClick={() => selectDate(day.key)}
                      />
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => showDateGroup(-1, DESKTOP_DATE_PAGE_SIZE, desktopDateStart, setDesktopDateStart)}
                      disabled={!canShowPreviousDesktopDates}
                      className="inline-flex h-10 w-12 items-center justify-center rounded-xl border border-gold/25 bg-black/25 text-gold-light transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Ver datas anteriores"
                    >
                      <FiChevronLeft />
                    </button>
                    <span className="h-1.5 w-16 rounded-full bg-gold/35" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => showDateGroup(1, DESKTOP_DATE_PAGE_SIZE, desktopDateStart, setDesktopDateStart)}
                      disabled={!canShowNextDesktopDates}
                      className="inline-flex h-10 w-12 items-center justify-center rounded-xl border border-gold/25 bg-black/25 text-gold-light transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Ver mais datas"
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                </div>
              </div>

              <div ref={timeCardRef} className="rounded-2xl border border-gold/20 bg-gradient-to-b from-dark-card/85 to-dark/95 p-4 sm:p-5">
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
                            Horários disponíveis
                          </p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
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
                          <p className="font-display text-2xl text-cream">Sem horários livres</p>
                          <p className="mt-2 text-sm text-cream/55">
                            Escolha outra data ou avance para o próximo dia disponível.
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

function DateButton({ day, active, loading, compact = false, onClick }) {
  const isUnavailable = !day.isBusinessDay || day.availableSlots.length === 0

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`${compact ? 'min-h-[4.35rem] px-1.5 py-2' : 'min-h-[4.75rem] p-2 sm:min-h-[4.25rem]'} w-full rounded-xl border text-center transition-colors disabled:cursor-wait disabled:opacity-60 ${
        active
          ? 'border-gold bg-gold text-dark shadow-[0_0_18px_rgba(217,177,92,0.25)]'
          : isUnavailable
            ? 'border-white/8 bg-white/[0.03] text-cream/35 hover:border-white/15'
            : 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20'
      }`}
      aria-pressed={active}
    >
      <span className={`${compact ? 'text-[0.55rem]' : 'text-[0.62rem]'} block font-bold uppercase tracking-wider`}>
        {formatShortWeekday(day.date)}
      </span>
      <span className={`${compact ? 'text-lg' : 'text-xl'} mt-1 block font-display leading-none`}>
        {formatDayNumber(day.date)}
      </span>
      <span className={`${compact ? 'text-[0.5rem]' : 'text-[0.58rem] sm:text-[0.62rem]'} mt-1 block font-bold uppercase leading-tight tracking-wider`}>
        {day.availableSlots.length > 0 ? `${day.availableSlots.length} vagas` : day.isBusinessDay ? 'lotado' : 'fechado'}
      </span>
    </button>
  )
}

function buildAgendaDays(bookings, availabilityDays) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysCount = Math.max(30, availabilityDays.length || 0)

  return Array.from({ length: daysCount }, (_, index) => {
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
  if (day.availableSlots.length) return `${day.availableSlots.length} horário(s)`
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
