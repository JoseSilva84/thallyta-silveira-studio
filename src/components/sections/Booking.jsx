import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiAlertTriangle, FiCheck, FiCalendar, FiCheckCircle, FiCreditCard, FiLoader } from 'react-icons/fi'
import { toast } from 'react-toastify'
import Cal, { getCalApi } from '@calcom/embed-react'
import { allServices } from '../../data/services.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useBooking } from '../../context/BookingContext.jsx'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'

const CAL_USERNAME = import.meta.env.VITE_CAL_USERNAME || 'thallyta-silveira-hxfjrf'
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const PENDING_PAYMENT_STORAGE_KEY = 'thallytaPendingBookingPaymentId'
const PREFERRED_SLOT_STORAGE_KEY = 'thallytaPreferredScheduleSlot'
const BOOKING_CHECKOUT_DRAFT_KEY = 'thallytaBookingCheckoutDraft'
const CAL_THEME = {
  'cal-bg': '#3d3528',
  'cal-bg-emphasis': '#514735',
  'cal-bg-subtle': '#473d2d',
  'cal-bg-muted': '#5f523a',
  'cal-bg-inverted': '#D9B15C',
  'cal-text': '#F8F3E8',
  'cal-text-emphasis': '#F7E6A8',
  'cal-text-subtle': 'rgba(248,243,232,0.72)',
  'cal-text-muted': 'rgba(248,243,232,0.55)',
  'cal-border': 'rgba(217,177,92,0.28)',
  'cal-border-emphasis': 'rgba(217,177,92,0.55)',
  'cal-border-subtle': 'rgba(217,177,92,0.18)',
  'cal-brand': '#D9B15C',
  'cal-brand-emphasis': '#F7E6A8',
  'cal-brand-text': '#15120F',
}

const getCalLinkFromUrl = (url) => {
  if (!url) return `${CAL_USERNAME}/30min`
  return url.replace(/^https?:\/\/(?:www\.)?cal\.com\//, '').replace(/^\/+/, '')
}

const getValidParam = (params, ...names) => {
  for (const name of names) {
    const value = params.get(name)
    if (value && !['null', 'undefined', ''].includes(value.trim().toLowerCase())) {
      return value
    }
  }
  return null
}

const readPreferredSlot = () => {
  try {
    const value = window.localStorage?.getItem(PREFERRED_SLOT_STORAGE_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const readCheckoutDraft = () => {
  try {
    const value = window.localStorage?.getItem(BOOKING_CHECKOUT_DRAFT_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const writeCheckoutDraft = ({ serviceId, paymentType, continueAfterLogin = false }) => {
  try {
    window.localStorage?.setItem(BOOKING_CHECKOUT_DRAFT_KEY, JSON.stringify({
      serviceId,
      paymentType,
      continueAfterLogin,
      updatedAt: Date.now(),
    }))
  } catch {
    // The current in-memory flow still works if storage is unavailable.
  }
}

const clearCheckoutDraft = () => {
  try {
    window.localStorage?.removeItem(BOOKING_CHECKOUT_DRAFT_KEY)
  } catch {
    // Ignore cleanup failures.
  }
}

const formatPreferredSlotDate = (slot) => {
  if (!slot?.start) return ''
  return new Date(slot.start).toLocaleDateString('pt-BR', {
    timeZone: 'America/Fortaleza',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

export default function Booking({ embedded = false } = {}) {
  const { user, setLoginOpen, getToken } = useAuth()
  const {
    selectedServices,
    addService,
    toggleService,
    clearServices,
    fetchBookings,
    scheduleRequestId,
    setIsBookingDetailsStep,
    setIsScheduleStepOpen,
    paymentType,
    setPaymentType,
    setIsPaymentUnlocked,
  } = useBooking()
  const [showCal, setShowCal] = useState(false)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [confirmedSummary, setConfirmedSummary] = useState(null)
  const [isCalFrameLoaded, setIsCalFrameLoaded] = useState(false)
  const [bookingPayment, setBookingPayment] = useState(null)
  const [creatingPayment, setCreatingPayment] = useState(false)
  const [redirectingToPayment, setRedirectingToPayment] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [preferredSlot, setPreferredSlot] = useState(() => readPreferredSlot())
  const [confirmingSelectedSlot, setConfirmingSelectedSlot] = useState(false)
  const sectionRef = useRef(null)
  const calFrameWrapRef = useRef(null)
  const lastScheduleRequest = useRef(scheduleRequestId)
  const lastBookingSuccessAt = useRef(0)
  const isCalReadyRef = useRef(false)
  const pendingPaymentChecked = useRef(false)
  const previousUserIdRef = useRef(user?.id || null)
  const restoredCheckoutDraftRef = useRef(false)
  const autoProceedAfterLoginRef = useRef(false)
  const bookingSnapshotRef = useRef({
    services: '',
    total: 0,
    name: '',
    email: '',
    whatsapp: '',
  })
  const bookingHash = embedded ? '#servicos' : '#agendamento'

  const focusBookingSection = useCallback(() => {
    window.history.replaceState(null, '', bookingHash)
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [bookingHash])

  const resetScheduleState = useCallback(() => {
    isCalReadyRef.current = false
    pendingPaymentChecked.current = false
    setIsBookingDetailsStep(false)
    setIsScheduleStepOpen(false)
    setShowCal(false)
    setBookingConfirmed(false)
    setConfirmedSummary(null)
    setBookingPayment(null)
    setRedirectingToPayment(false)
    setPreferredSlot(null)
    setIsPaymentUnlocked(false)
    clearCheckoutDraft()
    clearServices()
  }, [clearServices, setIsBookingDetailsStep, setIsPaymentUnlocked, setIsScheduleStepOpen])

  useEffect(() => {
    const previousUserId = previousUserIdRef.current
    const currentUserId = user?.id || null

    if (previousUserId && previousUserId !== currentUserId) {
      window.localStorage?.removeItem(PENDING_PAYMENT_STORAGE_KEY)
      window.localStorage?.removeItem(PREFERRED_SLOT_STORAGE_KEY)
      clearCheckoutDraft()
      resetScheduleState()
    }

    previousUserIdRef.current = currentUserId
  }, [resetScheduleState, user?.id])

  useEffect(() => {
    const handleSlotSelected = (event) => {
      setPreferredSlot(event.detail || readPreferredSlot())
    }

    window.addEventListener('booking:slot-selected', handleSlotSelected)
    return () => window.removeEventListener('booking:slot-selected', handleSlotSelected)
  }, [])

  // Inicializa a API do Cal.com embed e escuta o evento de booking concluído
  useEffect(() => {
    let isActive = true

    ;(async () => {
      const cal = await getCalApi()
      if (!isActive) return

      cal('ui', {
        theme: 'dark',
        styles: { branding: { brandColor: '#D9B15C' } },
        hideEventTypeDetails: true,
        layout: 'month_view',
        cssVarsPerTheme: {
          dark: CAL_THEME,
        },
      })
      cal('on', {
        action: 'linkReady',
        callback: () => {
          if (!isActive) return
          isCalReadyRef.current = true
          setIsBookingDetailsStep(false)
        },
      })
      cal('on', {
        action: '__routeChanged',
        callback: () => {
          if (!isActive || !isCalReadyRef.current) return
          setIsBookingDetailsStep((current) => !current)
        },
      })
      cal('on', {
        action: 'bookingSuccessful',
        callback: () => {
          if (!isActive) return
          const now = Date.now()
          if (now - lastBookingSuccessAt.current < 5000) return
          lastBookingSuccessAt.current = now

          // Esconde o Cal.com e mostra nossa tela de confirmação
          setConfirmedSummary(bookingSnapshotRef.current)
          setBookingConfirmed(true)
          setIsBookingDetailsStep(false)
          clearServices()
          setBookingPayment(null)
          setPreferredSlot(null)
          setIsPaymentUnlocked(false)
          window.localStorage?.removeItem(PENDING_PAYMENT_STORAGE_KEY)
          window.localStorage?.removeItem(PREFERRED_SLOT_STORAGE_KEY)
          clearCheckoutDraft()
          window.dispatchEvent(new Event('booking:updated'))
          setTimeout(() => window.dispatchEvent(new Event('booking:updated')), 3000)
          setTimeout(() => window.dispatchEvent(new Event('booking:updated')), 8000)
          setTimeout(() => window.dispatchEvent(new Event('booking:updated')), 15000)
          toast.success('🎉 Agendamento confirmado com sucesso!')
          // Atualiza os bookings no contexto (para os selos de fidelidade)
          const token = getToken()
          if (token) {
            // Polling simples para aguardar o webhook da cal.com criar o agendamento
            fetchBookings(token)
            setTimeout(() => fetchBookings(token), 3000)
            setTimeout(() => fetchBookings(token), 8000)
            setTimeout(() => fetchBookings(token), 15000)
          }
        },
      })
    })()

    return () => {
      isActive = false
      isCalReadyRef.current = false
      setIsBookingDetailsStep(false)
      setIsScheduleStepOpen(false)
    }
  }, [clearServices, getToken, fetchBookings, setIsBookingDetailsStep, setIsScheduleStepOpen])

  useEffect(() => {
    setIsScheduleStepOpen(showCal && !bookingConfirmed)
  }, [bookingConfirmed, setIsScheduleStepOpen, showCal])

  useEffect(() => {
    if (!showCal) return undefined

    setIsCalFrameLoaded(false)

    const attachLoadListener = () => {
      const iframe = calFrameWrapRef.current?.querySelector('iframe')
      if (!iframe) return null

      const handleLoad = () => setIsCalFrameLoaded(true)
      iframe.addEventListener('load', handleLoad, { once: true })
      return () => iframe.removeEventListener('load', handleLoad)
    }

    let cleanupLoad = attachLoadListener()
    const observer = new MutationObserver(() => {
      if (cleanupLoad) return
      cleanupLoad = attachLoadListener()
    })

    if (calFrameWrapRef.current) {
      observer.observe(calFrameWrapRef.current, { childList: true, subtree: true })
    }

    return () => {
      observer.disconnect()
      cleanupLoad?.()
    }
  }, [showCal])

  // Monta a string de serviços selecionados para enviar como metadata ao Cal.com
  const servicesParam = useMemo(
    () => selectedServices.map((s) => s.name).join(', '),
    [selectedServices],
  )
  const selectedService = selectedServices[0] || null
  const selectedCalLink = useMemo(() => getCalLinkFromUrl(selectedService?.calUrl), [selectedService?.calUrl])

  // Calcula o preço total estimado (pega o primeiro valor numérico de cada preço)
  const totalEstimado = useMemo(() => {
    return selectedServices.reduce((sum, s) => {
      const match = s.price.match(/R\$\s*([\d.,]+)/)
      if (match) {
        return sum + parseFloat(match[1].replace('.', '').replace(',', '.'))
      }
      return sum
    }, 0)
  }, [selectedServices])

  const openScheduleFromPayment = useCallback((payment, options = {}) => {
    if (!payment) return

    const paidService = allServices.find((service) => service.id === payment.service.id) || payment.service
    addService(paidService)
    setBookingPayment(payment)
    setIsPaymentUnlocked(true)
    setPaymentType(payment.paymentType || 'deposit')
    setIsCalFrameLoaded(false)
    isCalReadyRef.current = false
    setIsBookingDetailsStep(false)
    setShowCal(!preferredSlot)
    setBookingConfirmed(false)
    setConfirmedSummary(null)
    window.localStorage?.setItem(PENDING_PAYMENT_STORAGE_KEY, payment.id)
    focusBookingSection()

    if (options.recovered) {
      toast.info(preferredSlot ? 'Voce ja pagou. Confirme o horario selecionado.' : 'Voce ja tem um pagamento aprovado. Termine escolhendo a data e o horario.')
    } else if (options.notify !== false) {
      toast.success(preferredSlot ? 'Pagamento aprovado. Confirme o horario selecionado.' : 'Pagamento aprovado. Agora escolha a data e o horario.')
    }
  }, [addService, focusBookingSection, preferredSlot, setIsBookingDetailsStep, setIsPaymentUnlocked, setPaymentType])

  const handleProceed = useCallback(async () => {
    if (!selectedServices.length) {
      return toast.warn('Escolha pelo menos um serviço.')
    }
    if (!preferredSlot?.start) {
      document.getElementById('agenda')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return toast.info('Escolha o dia e horario na agenda para continuar.')
    }
    if (selectedService) {
      writeCheckoutDraft({
        serviceId: selectedService.id,
        paymentType,
        continueAfterLogin: !user,
      })
    }
    if (!user) {
      setLoginOpen(true)
      return toast.info('Entre na sua conta para agendar.')
    }
    if (!selectedService) return toast.warn('Escolha um servico para continuar.')

    const token = getToken()
    if (!token) {
      setLoginOpen(true)
      return toast.info('Entre na sua conta para agendar.')
    }

    const hasSelectedSlot = Boolean(preferredSlot?.start)
    if (hasSelectedSlot) {
      setRedirectingToPayment(true)
      toast.info('Horario selecionado. Redirecionando para o pagamento...')
    }
    setCreatingPayment(true)
    try {
      const res = await fetch(`${API}/payments/booking-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: selectedService.id,
          paymentType,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao iniciar pagamento.')

      if (data.payment?.id) {
        window.localStorage?.setItem(PENDING_PAYMENT_STORAGE_KEY, data.payment.id)
      }
      clearCheckoutDraft()
      window.location.href = data.initPoint || data.sandboxInitPoint
    } catch (error) {
      setRedirectingToPayment(false)
      toast.error(error.message)
    } finally {
      setCreatingPayment(false)
    }
  }, [getToken, paymentType, preferredSlot?.start, selectedService, selectedServices.length, setLoginOpen, user])

  useEffect(() => {
    if (scheduleRequestId === lastScheduleRequest.current) return
    lastScheduleRequest.current = scheduleRequestId
    handleProceed()
  }, [handleProceed, scheduleRequestId])

  useEffect(() => {
    if (restoredCheckoutDraftRef.current) return

    const draft = readCheckoutDraft()
    if (!draft?.serviceId) return

    const service = allServices.find((item) => item.id === draft.serviceId)
    if (!service) {
      clearCheckoutDraft()
      return
    }

    restoredCheckoutDraftRef.current = true
    addService(service)
    setPaymentType(draft.paymentType || 'deposit')
    if (draft.continueAfterLogin) focusBookingSection()
  }, [addService, focusBookingSection, setPaymentType])

  useEffect(() => {
    const draft = readCheckoutDraft()
    if (!user || !draft?.continueAfterLogin || autoProceedAfterLoginRef.current) return
    if (!selectedService || selectedService.id !== draft.serviceId) return

    autoProceedAfterLoginRef.current = true
    writeCheckoutDraft({
      serviceId: selectedService.id,
      paymentType,
      continueAfterLogin: false,
    })
    handleProceed()
  }, [handleProceed, paymentType, selectedService, user])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const bookingPaymentId = params.get('bookingPaymentId')
    if (!bookingPaymentId || !user) return

    const paymentId = getValidParam(params, 'payment_id', 'collection_id')
    const mpStatus = getValidParam(params, 'mpStatus', 'status', 'collection_status')
    const token = getToken()

    if (!token) return

    const cleanPaymentParams = () => {
      window.history.replaceState(null, '', `${window.location.pathname}${bookingHash}`)
    }

    const confirmPayment = async () => {
      setConfirmingPayment(true)
      focusBookingSection()
      try {
        if (mpStatus === 'failure' && !paymentId) {
          toast.info('Pagamento cancelado. Seu horario ainda nao foi reservado. Escolha a forma de pagamento para tentar novamente.')
          cleanPaymentParams()
          return
        }

        const query = paymentId ? `?payment_id=${encodeURIComponent(paymentId)}` : ''
        const res = await fetch(`${API}/payments/booking/${bookingPaymentId}/confirm${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Erro ao confirmar pagamento.')

        if (!data.canSchedule) {
          if (mpStatus === 'failure') {
            toast.error('Pagamento nao aprovado. O agendamento ainda nao foi liberado.')
          } else {
            toast.info('Pagamento pendente. Assim que for aprovado, volte para escolher o horario.')
          }
          cleanPaymentParams()
          return
        }

        openScheduleFromPayment(data.payment)
        cleanPaymentParams()
      } catch (error) {
        toast.error('Nao foi possivel confirmar o pagamento. Tente novamente ou escolha outra forma de pagamento.')
      } finally {
        setConfirmingPayment(false)
      }
    }

    confirmPayment()
  }, [bookingHash, focusBookingSection, getToken, openScheduleFromPayment, user])

  useEffect(() => {
    if (!user) {
      pendingPaymentChecked.current = false
      return
    }

    const params = new URLSearchParams(window.location.search)
    if (params.get('bookingPaymentId') || showCal || bookingConfirmed || pendingPaymentChecked.current) return

    const token = getToken()
    if (!token) return

    pendingPaymentChecked.current = true

    const restorePendingSchedule = async () => {
      try {
        const storedPaymentId = window.localStorage?.getItem(PENDING_PAYMENT_STORAGE_KEY)

        if (storedPaymentId) {
          const confirmRes = await fetch(`${API}/payments/booking/${storedPaymentId}/confirm`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const confirmData = await confirmRes.json().catch(() => ({}))
          if (confirmRes.ok && confirmData.canSchedule) {
            openScheduleFromPayment(confirmData.payment, { recovered: true })
            return
          }
        }

        const res = await fetch(`${API}/payments/pending-schedule`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.canSchedule) {
          openScheduleFromPayment(data.payment, { recovered: true })
        }
      } catch (error) {
        console.error('Erro ao recuperar pagamento aprovado sem horario:', error)
      }
    }

    restorePendingSchedule()
  }, [bookingConfirmed, getToken, openScheduleFromPayment, showCal, user])

  const handleNewBooking = () => {
    isCalReadyRef.current = false
    setIsBookingDetailsStep(false)
    setShowCal(false)
    setIsScheduleStepOpen(false)
    setBookingConfirmed(false)
    setConfirmedSummary(null)
    setBookingPayment(null)
    setPreferredSlot(null)
    setIsPaymentUnlocked(false)
    window.localStorage?.removeItem(PREFERRED_SLOT_STORAGE_KEY)
    clearCheckoutDraft()
  }

  const handleConfirmSelectedSlot = useCallback(async () => {
    if (!bookingPayment || !preferredSlot?.start) return

    const token = getToken()
    if (!token) {
      setLoginOpen(true)
      return toast.info('Entre na sua conta para confirmar o agendamento.')
    }

    setConfirmingSelectedSlot(true)
    try {
      const res = await fetch(`${API}/bookings/paid-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentId: bookingPayment.id,
          start: preferredSlot.start,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Nao foi possivel confirmar o horario.')

      const summary = {
        services: data.service || bookingPayment.service?.name || servicesParam,
        total: Number(data.estimatedValue || bookingPayment.servicePrice || totalEstimado),
        name: user?.name || '',
        email: user?.email || '',
        whatsapp: user?.whatsappPhone || '',
        date: preferredSlot.start,
        time: preferredSlot.time,
      }

      setConfirmedSummary(summary)
      setBookingConfirmed(true)
      setIsBookingDetailsStep(false)
      setShowCal(false)
      setBookingPayment(null)
      setPreferredSlot(null)
      setIsPaymentUnlocked(false)
      clearServices()
      window.localStorage?.removeItem(PENDING_PAYMENT_STORAGE_KEY)
      window.localStorage?.removeItem(PREFERRED_SLOT_STORAGE_KEY)
      clearCheckoutDraft()
      window.dispatchEvent(new Event('booking:updated'))
      fetchBookings(token)
      toast.success('Agendamento confirmado com sucesso!')
    } catch (error) {
      toast.error(error.message)
      window.dispatchEvent(new Event('booking:updated'))
    } finally {
      setConfirmingSelectedSlot(false)
    }
  }, [
    bookingPayment,
    clearServices,
    fetchBookings,
    getToken,
    preferredSlot,
    servicesParam,
    setIsBookingDetailsStep,
    setIsPaymentUnlocked,
    setLoginOpen,
    totalEstimado,
    user?.email,
    user?.name,
    user?.whatsappPhone,
  ])

  useEffect(() => {
    bookingSnapshotRef.current = {
      services: servicesParam,
      total: totalEstimado,
      name: user?.name || '',
      email: user?.email || '',
      whatsapp: user?.whatsappPhone || '',
    }
  }, [servicesParam, totalEstimado, user?.email, user?.name, user?.whatsappPhone])

  const shouldRenderEmbedded = !embedded || selectedServices.length > 0 || preferredSlot || bookingPayment || bookingConfirmed || creatingPayment || confirmingPayment
  if (!shouldRenderEmbedded) return null

  return (
    <section ref={sectionRef} id={embedded ? 'servicos-checkout' : 'agendamento'} className={embedded ? 'mt-10 scroll-mt-28' : 'premium-section py-16 md:py-20'}>
      <div className={embedded ? '' : 'section-shell'}>
        {!embedded && <SectionTitle eyebrow="Agendamento" title="Reserve seu horário" text="Monte seu atendimento em poucos passos." />}
        <Reveal>
          <div className="relative">
            <div className="absolute -inset-4 z-0 rounded-[3rem] bg-gradient-to-b from-gold/10 to-transparent opacity-40 blur-2xl"></div>
            <div className="gold-border relative z-10 overflow-hidden rounded-[2.5rem] bg-black/40 p-5 backdrop-blur-xl md:p-8 lg:p-12">

              {redirectingToPayment && (
                <div className="mb-8 rounded-2xl border border-gold/30 bg-gold/10 p-5 text-center shadow-[0_0_24px_rgba(217,177,92,0.16)]">
                  <FiLoader className="mx-auto h-8 w-8 animate-spin text-gold-light" />
                  <h3 className="mt-3 font-display text-2xl font-semibold text-gold-light">
                    Redirecionando para o pagamento
                  </h3>
                  <p className="mt-2 text-sm text-cream/70">
                    Seu dia e horario ja foram selecionados. Estamos abrindo o Mercado Pago para concluir a reserva.
                  </p>
                  {preferredSlot?.start && (
                    <p className="mt-3 text-sm font-semibold text-cream">
                      {formatPreferredSlotDate(preferredSlot)} as {preferredSlot.time}
                    </p>
                  )}
                </div>
              )}

              {/* Barra de progresso */}
              <div className="mb-10 grid grid-cols-3 gap-3">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      (step === 1 && selectedServices.length > 0) || (step === 2 && showCal) || (step === 3 && bookingConfirmed)
                        ? 'silver-glow bg-gradient-to-r from-gold to-gold-light shadow-[0_0_10px_rgba(217,177,92,0.4)]'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              {bookingConfirmed ? (
                /* ─── PASSO 3: Confirmação (nossa tela, sem Cal.com) ─── */
                <div className="space-y-8 text-center">
                  {/* Ícone animado */}
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold bg-gradient-to-br from-gold/20 to-gold/5 shadow-[0_0_30px_rgba(217,177,92,0.3)]">
                    <FiCheckCircle className="h-10 w-10 text-gold-light" />
                  </div>

                  <div>
                    <h3 className="font-display text-4xl font-semibold text-gold-light">Agendamento Confirmado!</h3>
                    <p className="mt-3 text-cream/60">
                      Enviamos um e-mail com todos os detalhes para você e para o studio.
                    </p>
                  </div>

                  {/* Detalhes do agendamento */}
                  <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-gold/20 bg-gradient-to-b from-dark-card/90 to-dark/95 p-6 text-left shadow-2xl backdrop-blur-md">
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Serviço</span>
                      <span className="mt-1 block text-lg font-semibold text-cream">{confirmedSummary?.services || servicesParam}</span>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent"></div>
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Cliente</span>
                      <span className="mt-1 block font-medium text-cream">{confirmedSummary?.name || user?.name}</span>
                      <span className="block text-sm text-cream/50">{confirmedSummary?.email || user?.email}</span>
                      {(confirmedSummary?.whatsapp || user?.whatsappPhone) && (
                        <span className="block text-sm text-cream/50">{confirmedSummary?.whatsapp || user?.whatsappPhone}</span>
                      )}
                    </div>
                    {confirmedSummary?.date && (
                      <>
                        <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent"></div>
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Data e horario</span>
                          <span className="mt-1 block font-medium text-cream">
                            {formatPreferredSlotDate({ start: confirmedSummary.date })} as {confirmedSummary.time}
                          </span>
                        </div>
                      </>
                    )}
                    {(confirmedSummary?.total || totalEstimado) > 0 && (
                      <>
                        <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent"></div>
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Valor Estimado</span>
                          <span className="mt-1 block text-lg font-semibold text-gold">{`R$ ${(confirmedSummary?.total || totalEstimado).toFixed(2).replace('.', ',')}`}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Botões de ação */}
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                    <button
                      onClick={handleNewBooking}
                      className="gold-button flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold uppercase tracking-wider"
                    >
                      <FiCalendar /> Novo Agendamento
                    </button>
                    <a
                      href="#fidelidade"
                      className="flex items-center gap-2 rounded-xl border border-gold/30 px-6 py-4 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/10"
                    >
                      Ver meus Selos de Fidelidade
                    </a>
                  </div>
                </div>

              ) : bookingPayment && preferredSlot ? (
                <SelectedSlotConfirmation
                  bookingPayment={bookingPayment}
                  preferredSlot={preferredSlot}
                  selectedServices={selectedServices}
                  confirming={confirmingSelectedSlot}
                  onConfirm={handleConfirmSelectedSlot}
                  onChooseCalendar={() => {
                    setPreferredSlot(null)
                    window.localStorage?.removeItem(PREFERRED_SLOT_STORAGE_KEY)
                    setShowCal(true)
                  }}
                />
              ) : !showCal ? (
                /* ─── PASSO 1: Seleção de Serviços ─── */
                <div className="space-y-8">
                  {!embedded && (
                  <section aria-labelledby="booking-services">
                    <h3 id="booking-services" className="mb-4 font-display text-3xl">1. Escolha seu serviço</h3>
                    <p className="mb-6 text-cream/60 text-sm">Selecione um serviço por agendamento para abrir a agenda com a duração correta.</p>
                    <div className="grid min-w-0 gap-4 md:grid-cols-2">
                      {allServices.map((service) => {
                        const isSelected = selectedServices.some((item) => item.id === service.id)
                        return (
                          <label
                            key={service.id}
                            className={`group tap-gold relative flex min-w-0 cursor-pointer items-start gap-4 rounded-[1.25rem] border p-4 backdrop-blur-md transition-all duration-300 ${
                              isSelected
                                ? 'border-gold bg-gold/10 shadow-[0_0_15px_rgba(217,177,92,0.15)]'
                                : 'border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-gold/30 hover:bg-white/10'
                            }`}
                          >
                            <div
                              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[0.25rem] border transition-colors ${
                                isSelected ? 'border-gold bg-gold text-dark' : 'border-white/30 bg-black/20'
                              }`}
                            >
                              {isSelected && <FiCheck className="size-3.5 stroke-[3]" />}
                            </div>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleService(service)} className="hidden" />
                            <span className="min-w-0 flex-1">
                              <span className={`block break-words font-display text-lg font-semibold transition-colors ${isSelected ? 'text-gold-light' : 'text-cream group-hover:text-gold-light'}`}>
                                {service.name}
                              </span>
                              <span className="block break-words text-sm font-medium text-cream/60">{service.price}</span>
                              {service.duration && <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em] text-cream/40">Duração: {service.duration}</span>}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </section>
                  )}

                  {/* Resumo e botão */}
                  <div className="rounded-[2rem] border border-gold/20 bg-gradient-to-b from-dark-card/90 to-dark/95 p-6 shadow-2xl backdrop-blur-md md:p-8">
                    <h3 className="font-display text-2xl">Resumo</h3>
                    <div className="mt-4 space-y-3 rounded-xl border border-white/5 bg-white/5 p-5 text-sm">
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Serviço Selecionado</span>
                        <span className="mt-1 block font-medium text-cream">
                          {selectedServices.map((item) => item.name).join(', ') || 'Nenhum selecionado'}
                        </span>
                      </div>
                      {selectedService?.duration && (
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Duração</span>
                          <span className="mt-1 block font-medium text-cream">{selectedService.duration}</span>
                        </div>
                      )}
                      {selectedServices.length > 0 && (
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Estimativa de Valor</span>
                          <span className="mt-1 block font-medium text-cream">
                            {totalEstimado > 0 ? `R$ ${totalEstimado.toFixed(2).replace('.', ',')}` : 'Consultar preços variáveis'}
                          </span>
                        </div>
                      )}
                      {preferredSlot && (
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Horario escolhido</span>
                          <span className="mt-1 block font-medium text-cream">
                            {formatPreferredSlotDate(preferredSlot)} as {preferredSlot.time}
                          </span>
                        </div>
                      )}
                      {selectedServices.length > 0 && totalEstimado > 0 && (
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Pagamento para liberar agenda</span>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className={`cursor-pointer rounded-xl border p-4 transition-colors ${paymentType === 'deposit' ? 'border-gold bg-gold/10 text-gold-light' : 'border-white/10 bg-black/20 text-cream/70 hover:border-gold/30'}`}>
                              <input type="radio" name="paymentType" value="deposit" checked={paymentType === 'deposit'} onChange={() => setPaymentType('deposit')} className="sr-only" />
                              <span className="block text-xs font-bold uppercase tracking-wider">Entrada 30%</span>
                              <span className="mt-1 block font-display text-xl">R$ {(totalEstimado * 0.3).toFixed(2).replace('.', ',')}</span>
                            </label>
                            <label className={`cursor-pointer rounded-xl border p-4 transition-colors ${paymentType === 'full' ? 'border-gold bg-gold/10 text-gold-light' : 'border-white/10 bg-black/20 text-cream/70 hover:border-gold/30'}`}>
                              <input type="radio" name="paymentType" value="full" checked={paymentType === 'full'} onChange={() => setPaymentType('full')} className="sr-only" />
                              <span className="block text-xs font-bold uppercase tracking-wider">Pagar tudo</span>
                              <span className="mt-1 block font-display text-xl">R$ {totalEstimado.toFixed(2).replace('.', ',')}</span>
                            </label>
                          </div>
                          <p className="mt-3 text-xs leading-5 text-cream/50">
                            O horario so sera liberado apos o Mercado Pago confirmar pelo menos 30% do valor do servico.
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleProceed}
                      disabled={creatingPayment || confirmingPayment}
                      className="gold-button mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(217,177,92,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingPayment || confirmingPayment ? <FiLoader className="text-lg animate-spin" /> : <FiCreditCard className="text-lg" />}
                      {creatingPayment ? 'Abrindo Mercado Pago...' : confirmingPayment ? 'Confirmando pagamento...' : preferredSlot?.start ? 'Pagar e Reservar' : 'Escolher Data e Horario'}
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── PASSO 2: Widget Cal.com ─── */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-3xl">2. Escolha data e horário</h3>
                    <button
                      onClick={() => {
                        isCalReadyRef.current = false
                        setIsBookingDetailsStep(false)
                        setShowCal(false)
                      }}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-cream/70 transition-colors hover:border-gold/30 hover:text-gold"
                    >
                      ← Voltar aos serviços
                    </button>
                  </div>

                  {/* Serviço selecionado - chip bar */}
                  <div className="flex flex-wrap gap-2">
                    {selectedServices.map((s) => (
                      <span key={s.id} className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-light">
                        {s.name}
                      </span>
                    ))}
                  </div>

                  {bookingPayment && (
                    <div className="flex gap-3 rounded-xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                      <FiAlertTriangle className="mt-0.5 shrink-0 text-lg text-emerald-200" />
                      <div>
                        <p className="font-semibold">Voce ja pagou e precisa finalizar o agendamento.</p>
                        <p className="mt-1 text-emerald-100/80">
                          Pagamento aprovado: {bookingPayment.paymentType === 'full' ? 'valor total' : 'entrada de 30%'} de R$ {bookingPayment.amount.toFixed(2).replace('.', ',')}. Escolha a data e o horario abaixo.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Aviso de rolagem */}
                  <div className="flex items-center gap-2 rounded-lg bg-gold/10 p-3 text-sm text-gold-light">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20">↓</span>
                    Dica: Após selecionar o dia, role a lista de horários para baixo para ver mais opções.
                  </div>

                  {/* Widget inline do Cal.com */}
                  <div ref={calFrameWrapRef} className="relative overflow-hidden rounded-2xl border border-white/10">
                    {!isCalFrameLoaded && (
                      <div className="pointer-events-none absolute inset-0 z-10 flex min-h-[500px] flex-col items-center justify-center gap-3 bg-dark/80 text-center backdrop-blur-sm">
                        <FiLoader className="h-8 w-8 animate-spin text-gold-light" />
                        <div>
                          <p className="font-display text-2xl font-semibold text-gold-light">Carregando agenda</p>
                          <p className="mt-1 text-sm text-cream/60">Buscando dias e horários disponíveis.</p>
                        </div>
                      </div>
                    )}
                    <Cal
                      calLink={selectedCalLink}
                      style={{ width: '100%', height: '100%', overflow: 'scroll', minHeight: '500px' }}
                      config={{
                        layout: 'month_view',
                        theme: 'dark',
                        cssVarsPerTheme: {
                          dark: CAL_THEME,
                        },
                        name: user?.name || '',
                        email: user?.email || '',
                        notes: `Serviços: ${servicesParam}`,
                        'metadata[services]': selectedServices.map((s) => s.id).join(','),
                        'metadata[serviceNames]': servicesParam,
                        'metadata[servicePrices]': selectedServices.map((s) => `${s.name}: ${s.price}`).join(' | '),
                        'metadata[estimatedValue]': totalEstimado.toFixed(2),
                        'metadata[attendeeWhatsapp]': user?.whatsappPhone || '',
                        'metadata[bookingPaymentId]': bookingPayment?.id || '',
                        'metadata[paymentType]': bookingPayment?.paymentType || '',
                        'metadata[paidAmount]': bookingPayment?.amount?.toFixed(2) || '',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function SelectedSlotConfirmation({ bookingPayment, preferredSlot, selectedServices, confirming, onConfirm, onChooseCalendar }) {
  const serviceName = selectedServices.map((service) => service.name).join(', ') || bookingPayment?.service?.name || 'Servico selecionado'
  const paidLabel = bookingPayment?.paymentType === 'full' ? 'valor total' : 'entrada de 30%'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h3 className="font-display text-3xl text-gold-light">Confirme seu horario</h3>
        <p className="mt-2 text-sm text-cream/60">
          Seu pagamento foi aprovado. Confira o resumo abaixo e confirme para reservar esse dia e horario.
        </p>
      </div>

      <div className="rounded-2xl border border-gold/20 bg-black/25 p-5">
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Servico</span>
            <span className="mt-1 block font-medium text-cream">{serviceName}</span>
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Data e horario</span>
            <span className="mt-1 block font-medium text-cream">
              {formatPreferredSlotDate(preferredSlot)} as {preferredSlot.time}
            </span>
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Pagamento aprovado</span>
            <span className="mt-1 block font-medium text-emerald-200">
              {paidLabel} de R$ {Number(bookingPayment?.amount || 0).toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Valor do servico</span>
            <span className="mt-1 block font-medium text-cream">
              R$ {Number(bookingPayment?.servicePrice || 0).toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className="gold-button flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-60"
        >
          {confirming ? <FiLoader className="animate-spin" /> : <FiCheckCircle />}
          {confirming ? 'Confirmando horario...' : 'Confirmar horario'}
        </button>
        <button
          type="button"
          onClick={onChooseCalendar}
          disabled={confirming}
          className="rounded-xl border border-white/10 px-5 py-4 text-sm font-semibold text-cream/70 transition-colors hover:border-gold/30 hover:text-gold-light disabled:cursor-not-allowed disabled:opacity-60"
        >
          Escolher outro horario
        </button>
      </div>
    </div>
  )
}
