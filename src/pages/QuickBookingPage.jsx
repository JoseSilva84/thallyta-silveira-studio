import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiLoader,
  FiRefreshCw,
  FiScissors,
  FiX,
} from 'react-icons/fi'
import { allServices } from '../data/services.js'
import { useAuth } from '../context/AuthContext.jsx'
import LoginModal from '../components/auth/LoginModal.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const STUDIO_TIME_ZONE = 'America/Fortaleza'
const QUICK_DRAFT_KEY = 'thallytaQuickBookingDraft'
const PENDING_PAYMENT_STORAGE_KEY = 'thallytaPendingBookingPaymentId'
const DATE_PAGE_SIZE = 7

const money = (value) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`

const servicePriceValue = (service) => Number(String(service?.price || '0').replace(/[^\d,.-]/g, '').replace(',', '.')) || 0

const readQuickDraft = () => {
  try {
    const value = window.localStorage?.getItem(QUICK_DRAFT_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const writeQuickDraft = (draft) => {
  try {
    window.localStorage?.setItem(QUICK_DRAFT_KEY, JSON.stringify({ ...draft, updatedAt: Date.now() }))
  } catch {
    // Flow still works without storage.
  }
}

const clearQuickDraft = () => {
  try {
    window.localStorage?.removeItem(QUICK_DRAFT_KEY)
  } catch {
    // Ignore cleanup failures.
  }
}

export default function QuickBookingPage() {
  const { user, getToken, setLoginOpen } = useAuth()
  const [agendaDays, setAgendaDays] = useState([])
  const [agendaServiceId, setAgendaServiceId] = useState('')
  const [bookings, setBookings] = useState([])
  const [loadingAgenda, setLoadingAgenda] = useState(false)
  const [agendaError, setAgendaError] = useState('')
  const [dateStart, setDateStart] = useState(0)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [paymentType, setPaymentType] = useState('deposit')
  const [creatingPayment, setCreatingPayment] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState(null)
  const [confirmedPayment, setConfirmedPayment] = useState(null)

  const serviceIdForAgenda = selectedSlot && selectedService?.id ? selectedService.id : ''
  const total = servicePriceValue(selectedService)
  const deposit = Math.round(total * 30) / 100
  const amountToPay = paymentType === 'full' ? total : deposit
  const remaining = paymentType === 'full' ? 0 : Math.max(total - deposit, 0)

  const days = useMemo(() => buildAgendaDays(bookings, agendaDays), [agendaDays, bookings])
  const visibleDays = days.slice(dateStart, dateStart + DATE_PAGE_SIZE)
  const selectedDay = days.find((day) => day.key === selectedDate) || days.find((day) => day.availableSlots.length > 0) || days[0]
  const nextAvailableDay = days.find((day) => day.availableSlots.length > 0 && day.key !== selectedDay?.key)
  const pageStep = confirmedBooking
    ? 'confirmed'
    : !selectedSlot
      ? 'agenda'
      : !user
        ? 'login'
        : !selectedService
          ? 'service'
          : 'summary'
  const currentStep = pageStep === 'confirmed' ? 5 : pageStep === 'summary' ? 4 : pageStep === 'service' ? 3 : pageStep === 'login' ? 2 : 1
  const pageTitle = {
    agenda: 'Escolha seu horario',
    login: 'Entre para continuar',
    service: 'Escolha o servico',
    summary: 'Revise e pague',
    confirmed: 'Agendamento confirmado',
  }[pageStep]
  const pageSubtitle = {
    agenda: 'Selecione o melhor dia e horario disponivel.',
    login: 'Acesse sua conta para reservar esse horario.',
    service: 'Escolha o cuidado que deseja agendar.',
    summary: 'Confira os dados e escolha como deseja pagar.',
    confirmed: 'Seu horario foi reservado com sucesso.',
  }[pageStep]

  const fetchAgenda = useCallback(async () => {
    setLoadingAgenda(true)
    setAgendaError('')
    try {
      const params = new URLSearchParams({ days: '30' })
      if (serviceIdForAgenda) params.set('serviceId', serviceIdForAgenda)
      const res = await fetch(`${API}/bookings/public-agenda?${params.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar agenda.')
      setBookings(Array.isArray(data.bookings) ? data.bookings : [])
      setAgendaDays(Array.isArray(data.agendaDays) ? data.agendaDays : [])
      setAgendaServiceId(data.serviceId || '')
    } catch (error) {
      setAgendaError(error.message || 'Erro ao carregar agenda.')
    } finally {
      setLoadingAgenda(false)
    }
  }, [serviceIdForAgenda])

  useEffect(() => {
    fetchAgenda()
  }, [fetchAgenda])

  useEffect(() => {
    const draft = readQuickDraft()
    if (!draft) return

    if (draft.slot) {
      setSelectedSlot(draft.slot)
      setSelectedDate(draft.slot.date || '')
    }

    if (draft.serviceId) {
      const service = allServices.find((item) => item.id === draft.serviceId)
      if (service) setSelectedService(service)
    }

    if (draft.paymentType) setPaymentType(draft.paymentType)
  }, [])

  useEffect(() => {
    if (!days.length || selectedSlot) return
    const firstAvailable = days.find((day) => day.availableSlots.length > 0)
    const currentDay = days.find((day) => day.key === selectedDate)
    if (!selectedDate || (firstAvailable && !currentDay?.availableSlots?.length)) {
      setSelectedDate((firstAvailable || days[0]).key)
    }
  }, [days, selectedDate, selectedSlot])

  useEffect(() => {
    if (!selectedDate || !days.length) return
    const selectedIndex = days.findIndex((day) => day.key === selectedDate)
    if (selectedIndex >= 0 && (selectedIndex < dateStart || selectedIndex >= dateStart + DATE_PAGE_SIZE)) {
      setDateStart(Math.floor(selectedIndex / DATE_PAGE_SIZE) * DATE_PAGE_SIZE)
    }
  }, [dateStart, days, selectedDate])

  useEffect(() => {
    if (!selectedService || !selectedSlot || loadingAgenda) return
    if (agendaServiceId !== selectedService.id) return
    if (!agendaDays.length) return

    const slotStillAvailable = agendaDays.some((day) =>
      (day.availableSlots || []).some((slot) => slot.start === selectedSlot.start),
    )

    if (slotStillAvailable) return

    const firstAvailable = agendaDays.find((day) => day.availableSlots?.length)
    const nextDate = firstAvailable?.date || selectedDate
    setSelectedSlot(null)
    setSelectedDate(nextDate)
    writeQuickDraft({ serviceId: selectedService.id, paymentType })
    toast.warn('Esse servico nao cabe no horario escolhido. Selecione outro horario disponivel.')
    document.querySelector('main')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [agendaDays, agendaServiceId, loadingAgenda, paymentType, selectedDate, selectedService, selectedSlot])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const bookingPaymentId = params.get('bookingPaymentId')
    if (!bookingPaymentId || !user || confirmingPayment) return

    const token = getToken()
    if (!token) return

    const paymentId = params.get('payment_id') || params.get('collection_id')
    const mpStatus = params.get('mpStatus') || params.get('status') || params.get('collection_status')

    const confirm = async () => {
      setConfirmingPayment(true)
      try {
        if (mpStatus === 'failure' && !paymentId) {
          toast.info('Pagamento cancelado. O horario ainda nao foi reservado.')
          window.history.replaceState(null, '', '/agendar')
          return
        }

        const confirmParams = new URLSearchParams()
        if (paymentId) confirmParams.set('payment_id', paymentId)
        if (selectedSlot?.start) confirmParams.set('start', selectedSlot.start)
        const query = confirmParams.toString() ? `?${confirmParams.toString()}` : ''
        const res = await fetch(`${API}/payments/booking/${bookingPaymentId}/confirm${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Erro ao confirmar pagamento.')

        if (data.booking) {
          setConfirmedBooking(data.booking)
          setConfirmedPayment(data.payment || null)
          setSelectedSlot({ start: data.booking.scheduledAt, time: formatTime(data.booking.scheduledAt), date: toDateKey(new Date(data.booking.scheduledAt)) })
          clearQuickDraft()
          window.localStorage?.removeItem(PENDING_PAYMENT_STORAGE_KEY)
          window.history.replaceState(null, '', '/agendar')
          toast.success('Agendamento confirmado com sucesso!')
          return
        }

        toast.info(data.message || 'Pagamento em processamento.')
        window.history.replaceState(null, '', '/agendar')
      } catch (error) {
        toast.error(error.message || 'Nao foi possivel confirmar o pagamento.')
      } finally {
        setConfirmingPayment(false)
      }
    }

    confirm()
  }, [confirmingPayment, getToken, selectedSlot?.start, user])

  const chooseSlot = (day, slot) => {
    const nextSlot = { date: day.key, start: slot.start, time: slot.time }
    setSelectedSlot(nextSlot)
    setSelectedDate(day.key)
    writeQuickDraft({
      slot: nextSlot,
      serviceId: selectedService?.id || '',
      paymentType,
    })
  }

  const continueAfterSlot = () => {
    if (!selectedSlot) return toast.info('Escolha um horario para continuar.')
    if (!user) {
      writeQuickDraft({ slot: selectedSlot, serviceId: selectedService?.id || '', paymentType })
      setLoginOpen(true)
      return
    }
    document.getElementById('quick-services')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const chooseService = (service) => {
    setSelectedService(service)
    writeQuickDraft({ slot: selectedSlot, serviceId: service.id, paymentType })
    window.setTimeout(() => document.getElementById('quick-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const startPayment = async () => {
    if (!selectedSlot?.start) return toast.info('Escolha um horario.')
    if (!selectedService) return toast.info('Escolha um servico.')
    const token = getToken()
    if (!token) {
      setLoginOpen(true)
      return
    }

    setCreatingPayment(true)
    try {
      writeQuickDraft({ slot: selectedSlot, serviceId: selectedService.id, paymentType })
      const res = await fetch(`${API}/payments/booking-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: selectedService.id,
          paymentType,
          start: selectedSlot.start,
          returnPath: '/agendar',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao iniciar pagamento.')
      if (data.payment?.id) window.localStorage?.setItem(PENDING_PAYMENT_STORAGE_KEY, data.payment.id)
      window.location.href = data.initPoint || data.sandboxInitPoint
    } catch (error) {
      toast.error(error.message || 'Erro ao iniciar pagamento.')
    } finally {
      setCreatingPayment(false)
    }
  }

  const resetFlow = () => {
    setSelectedSlot(null)
    setSelectedService(null)
    setPaymentType('deposit')
    setConfirmedBooking(null)
    setConfirmedPayment(null)
    clearQuickDraft()
    window.history.replaceState(null, '', '/agendar')
    fetchAgenda()
  }

  const goBack = () => {
    if (pageStep === 'summary') {
      setSelectedService(null)
      writeQuickDraft({ slot: selectedSlot, paymentType })
      return
    }
    if (pageStep === 'service' || pageStep === 'login') {
      setSelectedSlot(null)
      setSelectedService(null)
      writeQuickDraft({ paymentType })
      return
    }
    if (pageStep === 'confirmed') {
      resetFlow()
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-cream">
      <div className="fixed inset-0 -z-20">
        <img src="/studio-01.jpeg" alt="" className="h-full w-full object-cover opacity-45 blur-sm scale-105" />
        <div className="absolute inset-0 bg-gradient-to-b from-dark/82 via-dark/72 to-dark/92" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,177,92,0.22),transparent_38%)]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-gold/15 bg-dark/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="tap-gold inline-flex size-10 items-center justify-center rounded-xl border border-gold/25 bg-white/5 text-gold-light" aria-label="Voltar para o site">
            <FiX />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl leading-tight text-gold-light">Thallyta Silveira</p>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cream/45">Agendamento rapido</p>
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 font-display text-lg text-gold-light">
            {currentStep}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">
        <section className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-light/70">Direto ao ponto</p>
          <h1 className="mt-2 font-display text-4xl text-cream md:text-5xl">{pageTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-cream/60">
            {pageSubtitle}
          </p>
          {pageStep !== 'agenda' && pageStep !== 'confirmed' && (
            <button type="button" onClick={goBack} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gold/25 bg-black/25 px-4 py-2 text-sm font-semibold text-gold-light hover:bg-gold/10">
              <FiArrowLeft /> Voltar
            </button>
          )}
        </section>

        {confirmingPayment && (
          <div className="mb-5 rounded-2xl border border-gold/25 bg-gold/10 p-4 text-sm text-gold-light">
            <FiLoader className="mr-2 inline animate-spin" /> Confirmando pagamento e agendamento...
          </div>
        )}

        {pageStep === 'confirmed' ? (
          <ConfirmationCard booking={confirmedBooking} payment={confirmedPayment} onNew={resetFlow} />
        ) : pageStep === 'agenda' ? (
            <section className="gold-border rounded-[2rem] bg-black/35 p-4 backdrop-blur-xl md:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">Agenda</p>
                  <h2 className="font-display text-3xl text-gold-light">Dia e horario</h2>
                </div>
                <button
                  type="button"
                  onClick={fetchAgenda}
                  disabled={loadingAgenda}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gold/25 px-4 py-2 text-sm font-semibold text-gold-light hover:bg-gold/10 disabled:opacity-60"
                >
                  <FiRefreshCw className={loadingAgenda ? 'animate-spin' : ''} /> Atualizar
                </button>
              </div>

              {agendaError && <div className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">{agendaError}</div>}

              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="mb-4 flex items-center justify-between">
                  <button type="button" onClick={() => setDateStart(Math.max(dateStart - DATE_PAGE_SIZE, 0))} className="tap-gold rounded-xl p-3 text-gold-light disabled:opacity-30" disabled={dateStart === 0}>
                    <FiChevronLeft />
                  </button>
                  <h3 className="font-display text-2xl text-cream">{formatMonth(selectedDay?.date || new Date())}</h3>
                  <button type="button" onClick={() => setDateStart(Math.min(dateStart + DATE_PAGE_SIZE, Math.max(days.length - DATE_PAGE_SIZE, 0)))} className="tap-gold rounded-xl p-3 text-gold-light disabled:opacity-30" disabled={dateStart + DATE_PAGE_SIZE >= days.length}>
                    <FiChevronRight />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-bold uppercase tracking-wider text-cream/35">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day) => <span key={day}>{day}</span>)}
                </div>

                <div className="mt-3 grid grid-cols-7 gap-1.5">
                  {visibleDays.map((day) => (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => setSelectedDate(day.key)}
                      className={`min-h-[4rem] rounded-xl border px-1 py-2 text-center transition-colors ${
                        selectedDay?.key === day.key
                          ? 'border-gold bg-gold text-dark'
                          : day.availableSlots.length
                            ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
                            : 'border-white/10 bg-white/[0.03] text-cream/35'
                      }`}
                    >
                      <span className="block text-[0.55rem] font-bold uppercase">{formatShortWeekday(day.date)}</span>
                      <span className="mt-1 block font-display text-xl">{formatDayNumber(day.date)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                {loadingAgenda ? (
                  <p className="text-sm text-cream/50">Carregando horarios...</p>
                ) : selectedDay?.availableSlots?.length ? (
                  <>
                    <p className="mb-3 text-center text-sm font-semibold text-cream/60">
                      Selecione o horario para {formatNumericDate(selectedDay.date)}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {selectedDay.availableSlots.map((slot) => {
                        const active = selectedSlot?.start === slot.start
                        return (
                          <button
                            key={slot.start}
                            type="button"
                            onClick={() => chooseSlot(selectedDay, slot)}
                            className={`flex items-center justify-between rounded-xl border px-4 py-4 text-lg font-bold transition-colors ${
                              active
                                ? 'border-gold bg-gold text-dark'
                                : 'border-white/10 bg-black/20 text-cream hover:border-gold/30 hover:bg-gold/10'
                            }`}
                          >
                            <span className={`size-6 rounded-full border ${active ? 'border-dark bg-dark/10 ring-2 ring-dark/20' : 'border-cream/30'}`} />
                            {slot.time}
                          </button>
                        )
                      })}
                    </div>
                    <button type="button" onClick={continueAfterSlot} className="gold-button mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 font-bold uppercase tracking-wider">
                      Proxima etapa <FiChevronRight />
                    </button>
                  </>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
                    <p className="font-display text-3xl text-cream">Sem horarios livres</p>
                    <p className="mt-2 text-sm text-cream/55">Escolha outra data ou avance para o proximo dia disponivel.</p>
                    {nextAvailableDay && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(nextAvailableDay.key)
                          const index = days.findIndex((day) => day.key === nextAvailableDay.key)
                          if (index >= 0) setDateStart(Math.floor(index / DATE_PAGE_SIZE) * DATE_PAGE_SIZE)
                        }}
                        className="gold-button mt-5 rounded-xl px-5 py-3 text-sm font-bold"
                      >
                        Proximo dia disponivel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
        ) : pageStep === 'login' ? (
          <section className="gold-border mx-auto max-w-2xl rounded-[2rem] bg-black/35 p-5 text-center backdrop-blur-xl md:p-8">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold-light">
              <FiCheckCircle className="size-8" />
            </div>
            <h2 className="mt-5 font-display text-4xl text-gold-light">Horario escolhido</h2>
            <p className="mt-2 text-sm text-cream/60">
              {selectedSlot ? `${formatLongDate(new Date(selectedSlot.start))} as ${selectedSlot.time}` : ''}
            </p>
            <button type="button" onClick={() => setLoginOpen(true)} className="gold-button mt-6 w-full rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-wider">
              Entrar para continuar
            </button>
          </section>
        ) : pageStep === 'service' ? (
            <section id="quick-services" className="mt-6 scroll-mt-24 rounded-[2rem] border border-gold/20 bg-black/30 p-4 md:p-6">
              <div className="mb-4 flex items-center gap-3">
                <FiScissors className="text-gold-light" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">Servico</p>
                  <h2 className="font-display text-3xl text-gold-light">Escolha o cuidado</h2>
                </div>
              </div>
              {!user && (
                <div className="mb-4 rounded-xl border border-gold/20 bg-gold/10 p-4 text-sm text-cream/75">
                  Entre na sua conta para escolher o servico e finalizar a reserva.
                  <button type="button" onClick={() => setLoginOpen(true)} className="ml-2 font-bold text-gold-light underline">Entrar agora</button>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allServices.map((service) => {
                  const active = selectedService?.id === service.id
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => user ? chooseService(service) : setLoginOpen(true)}
                      disabled={!selectedSlot}
                      className={`min-h-[7rem] rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                        active ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/10 bg-white/[0.04] text-cream hover:border-gold/30 hover:bg-gold/10'
                      }`}
                    >
                      <span className="block font-display text-lg">{service.name}</span>
                      <span className="mt-1 block text-sm text-cream/55">{service.duration}</span>
                      <span className="mt-3 block font-bold text-gold-light">{service.price}</span>
                    </button>
                  )
                })}
              </div>
            </section>
        ) : (
            <section id="quick-summary" className="mt-6 scroll-mt-24 rounded-[2rem] border border-gold/20 bg-gradient-to-b from-dark-card/90 to-dark/95 p-4 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <FiCreditCard className="text-gold-light" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">Resumo</p>
                  <h2 className="font-display text-3xl text-gold-light">Revise e pague</h2>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryItem label="Data e horario" value={selectedSlot ? `${formatLongDate(new Date(selectedSlot.start))} as ${selectedSlot.time}` : 'Escolha um horario'} icon={<FiClock />} />
                <SummaryItem label="Servico" value={selectedService?.name || 'Escolha um servico'} icon={<FiScissors />} />
                <SummaryItem label="Valor total" value={selectedService ? money(total) : '-'} icon={<FiCreditCard />} />
                <SummaryItem label="Cliente" value={user?.name || 'Entre na sua conta'} icon={<FiCheckCircle />} />
              </div>

              {selectedService && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('deposit')}
                    className={`rounded-xl border p-4 text-left transition-colors ${paymentType === 'deposit' ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/10 bg-black/20 text-cream/70'}`}
                  >
                    <span className="block text-xs font-bold uppercase tracking-wider">Entrada 30%</span>
                    <span className="mt-1 block font-display text-2xl">{money(deposit)}</span>
                    <span className="mt-1 block text-xs text-cream/45">Restante no atendimento: {money(remaining)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('full')}
                    className={`rounded-xl border p-4 text-left transition-colors ${paymentType === 'full' ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/10 bg-black/20 text-cream/70'}`}
                  >
                    <span className="block text-xs font-bold uppercase tracking-wider">Pagar tudo</span>
                    <span className="mt-1 block font-display text-2xl">{money(total)}</span>
                    <span className="mt-1 block text-xs text-cream/45">Sem restante no atendimento.</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={startPayment}
                disabled={creatingPayment || !selectedSlot || !selectedService || !user}
                className="gold-button mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-55"
              >
                {creatingPayment ? <FiLoader className="animate-spin" /> : <FiCreditCard />}
                {creatingPayment ? 'Abrindo Mercado Pago...' : `Pagar ${selectedService ? money(amountToPay) : ''}`}
              </button>
            </section>
        )}
      </main>
      <LoginModal />
    </div>
  )
}

function SummaryItem({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold-light">{icon}</span>
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/70">{label}</span>
          <span className="mt-1 block font-semibold text-cream">{value}</span>
        </div>
      </div>
    </div>
  )
}

function ConfirmationCard({ booking, payment, onNew }) {
  return (
    <section className="mx-auto max-w-2xl rounded-[2rem] border border-gold/25 bg-black/35 p-5 text-center backdrop-blur-xl md:p-8">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-emerald-100">
        <FiCheckCircle className="size-8" />
      </div>
      <h2 className="mt-5 font-display text-4xl text-gold-light">Agendamento confirmado!</h2>
      <p className="mt-2 text-sm text-cream/60">Enviamos os detalhes para voce e para o studio.</p>
      <div className="mt-6 space-y-4 rounded-2xl border border-gold/20 bg-black/25 p-5 text-left">
        <SummaryLine label="Servico" value={booking.service} />
        <SummaryLine label="Data e horario" value={`${formatLongDate(new Date(booking.scheduledAt))} as ${formatTime(booking.scheduledAt)}`} />
        <SummaryLine label="Cliente" value={booking.attendeeName || '-'} />
        <SummaryLine label="Valor" value={money(booking.estimatedValue)} />
        {payment && <SummaryLine label="Pago" value={money(payment.amount)} />}
      </div>
      <button type="button" onClick={onNew} className="gold-button mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-wider">
        <FiCalendar /> Novo agendamento
      </button>
    </section>
  )
}

function SummaryLine({ label, value }) {
  return (
    <div>
      <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/70">{label}</span>
      <span className="mt-1 block font-semibold text-cream">{value}</span>
    </div>
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
    const availability = availabilityDays.find((day) => day.date === key)
    const dayBookings = bookings.filter((booking) => toDateKey(new Date(booking.scheduledAt)) === key)

    return {
      key,
      date,
      bookings: dayBookings,
      isBusinessDay: availability?.isBusinessDay ?? true,
      availableSlots: availability?.availableSlots || [],
    }
  })
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

const formatShortWeekday = (date) => date.toLocaleDateString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  weekday: 'short',
}).replace('.', '')

const formatDayNumber = (date) => date.toLocaleDateString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  day: '2-digit',
})

const formatNumericDate = (date) => date.toLocaleDateString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
})

const formatLongDate = (date) => date.toLocaleDateString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
})

const formatTime = (dateInput) => new Date(dateInput).toLocaleTimeString('pt-BR', {
  timeZone: STUDIO_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})
