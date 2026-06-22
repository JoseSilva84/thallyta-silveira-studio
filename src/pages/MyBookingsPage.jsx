import { useMemo, useState } from 'react'
import { FiAlertTriangle, FiArrowLeft, FiCalendar, FiClock, FiDollarSign, FiEdit3, FiExternalLink, FiGift, FiPhone, FiRefreshCw, FiScissors, FiTrash2, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useBooking } from '../context/BookingContext.jsx'
import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'
import FloatingButtons from '../components/layout/FloatingButtons.jsx'
import LoyaltyCard from '../components/ui/LoyaltyCard.jsx'

const formatDate = (value) => {
  const date = new Date(value)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

const formatTime = (value) => {
  const date = new Date(value)
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatCurrency = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const statusInfo = {
  confirmed: {
    label: 'Confirmado',
    classes: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  },
  rescheduled: {
    label: 'Reagendado',
    classes: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  },
  cancelled: {
    label: 'Cancelado',
    classes: 'border-red-300/30 bg-red-300/10 text-red-100',
  },
}

function BookingStatus({ status }) {
  const info = statusInfo[status] || {
    label: status || 'Agendamento',
    classes: 'border-white/15 bg-white/5 text-cream/60',
  }

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${info.classes}`}>
      {info.label}
    </span>
  )
}

const findActionLink = (value, action) => {
  if (!value || typeof value !== 'object') return null

  const stack = [value]
  const actionWords = action === 'reschedule'
    ? ['reschedule', 'reagendar']
    : ['cancel', 'cancelar']

  while (stack.length) {
    const current = stack.pop()
    if (!current || typeof current !== 'object') continue

    for (const [key, item] of Object.entries(current)) {
      const keyMatches = actionWords.some((word) => key.toLowerCase().includes(word))

      if (typeof item === 'string') {
        const valueMatches = actionWords.some((word) => item.toLowerCase().includes(word))
        if ((keyMatches || valueMatches) && item.startsWith('http')) return item
      } else if (item && typeof item === 'object') {
        stack.push(item)
      }
    }
  }

  return null
}

function EmptyState() {
  return (
    <div className="gold-border rounded-lg bg-black/35 px-5 py-12 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full border border-gold/25 bg-gold/10 text-gold-light">
        <FiCalendar className="size-6" />
      </div>
      <h2 className="mt-5 font-display text-3xl font-semibold text-gold-light">Nenhum agendamento ainda</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-cream/60">
        Quando voce reservar um horario, ele aparece aqui para acompanhar ou cancelar.
      </p>
      <Link to="/#servicos" className="gold-button mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold uppercase tracking-wider">
        <FiCalendar /> Agendar agora
      </Link>
    </div>
  )
}

function BookingItem({ booking, cancelling, onCancel, onReschedule }) {
  const startsAt = new Date(booking.scheduledAt)
  const isFuture = startsAt > new Date()
  const canCancel = isFuture && booking.status !== 'cancelled'
  const whatsapp = booking.user?.whatsappPhone || booking.attendeePhone
  const estimatedValue = formatCurrency(booking.estimatedValue)

  return (
    <article className="gold-border rounded-lg bg-black/35 p-5 backdrop-blur-xl">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <BookingStatus status={booking.status} />
            {isFuture && booking.status !== 'cancelled' && (
              <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-light">
                Proximo
              </span>
            )}
            {booking.status !== 'cancelled' && (
              <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                booking.serviceCompletedAt
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                  : 'border-amber-300/30 bg-amber-300/10 text-amber-100'
              }`}>
                {booking.serviceCompletedAt ? 'Fidelidade liberada' : 'Fidelidade pendente'}
              </span>
            )}
          </div>

          <div>
            <h2 className="break-words font-display text-2xl font-semibold text-cream">{booking.service}</h2>
            <p className="mt-1 text-sm text-cream/50">{booking.attendeeName || booking.user?.name}</p>
          </div>

          <div className="grid gap-3 text-sm text-cream/70 sm:grid-cols-2">
            <span className="flex items-center gap-2">
              <FiCalendar className="shrink-0 text-gold" /> {formatDate(booking.scheduledAt)}
            </span>
            <span className="flex items-center gap-2">
              <FiClock className="shrink-0 text-gold" />
              {formatTime(booking.scheduledAt)}
              {booking.endTime && ` - ${formatTime(booking.endTime)}`}
            </span>
            {whatsapp && (
              <span className="flex items-center gap-2">
                <FiPhone className="shrink-0 text-gold" /> {whatsapp}
              </span>
            )}
            {estimatedValue && (
              <span className="flex items-center gap-2">
                <FiDollarSign className="shrink-0 text-gold" /> {estimatedValue}
              </span>
            )}
          </div>
        </div>

        {canCancel && (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
            <button
              type="button"
              onClick={() => onReschedule(booking)}
              className="tap-gold inline-flex items-center justify-center gap-2 rounded-lg border border-gold/25 px-4 py-3 text-sm font-semibold text-gold-light hover:bg-gold/10"
            >
              <FiEdit3 />
              Reagendar
            </button>
            <button
              type="button"
              onClick={() => onCancel(booking)}
              disabled={cancelling === booking.id}
              className="tap-gold inline-flex items-center justify-center gap-2 rounded-lg border border-red-300/30 px-4 py-3 text-sm font-semibold text-red-100 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiTrash2 />
              {cancelling === booking.id ? 'Cancelando...' : 'Cancelar'}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

function ActionModal({ booking, type, cancelling, onClose, onConfirmCancel }) {
  if (!booking) return null

  const isCancel = type === 'cancel'
  const actionLink = findActionLink(booking.calPayload, isCancel ? 'cancel' : 'reschedule')

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="gold-border w-full max-w-lg rounded-lg bg-dark-card p-5 shadow-2xl md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`grid size-11 place-items-center rounded-full border ${isCancel ? 'border-red-300/30 bg-red-400/10 text-red-100' : 'border-gold/25 bg-gold/10 text-gold-light'}`}>
              {isCancel ? <FiAlertTriangle /> : <FiEdit3 />}
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-gold-light">
                {isCancel ? 'Cancelar agendamento?' : 'Reagendar horario'}
              </h2>
              <p className="mt-1 text-sm text-cream/55">
                {isCancel ? 'Essa acao altera o status do seu horario.' : 'Escolha outro horario pelo Cal.com.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap-gold grid size-9 place-items-center rounded-full border border-white/10 text-cream/70 hover:border-gold/30 hover:text-gold-light"
            aria-label="Fechar"
          >
            <FiX />
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="break-words font-display text-xl font-semibold text-cream">{booking.service}</p>
          <div className="mt-3 grid gap-2 text-sm text-cream/70 sm:grid-cols-2">
            <span className="flex items-center gap-2">
              <FiCalendar className="text-gold" /> {formatDate(booking.scheduledAt)}
            </span>
            <span className="flex items-center gap-2">
              <FiClock className="text-gold" /> {formatTime(booking.scheduledAt)}
            </span>
          </div>
        </div>

        {isCancel ? (
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="tap-gold rounded-lg border border-white/10 px-5 py-3 text-sm font-semibold text-cream/80 hover:bg-white/10"
            >
              Manter horario
            </button>
            <button
              type="button"
              onClick={() => onConfirmCancel(booking)}
              disabled={cancelling === booking.id}
              className="tap-gold inline-flex items-center justify-center gap-2 rounded-lg border border-red-300/30 bg-red-400/10 px-5 py-3 text-sm font-semibold text-red-100 hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiTrash2 />
              {cancelling === booking.id ? 'Cancelando...' : 'Confirmar cancelamento'}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-cream/60">
              O Cal.com cuida da disponibilidade e envia a confirmacao atualizada por e-mail.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="tap-gold rounded-lg border border-white/10 px-5 py-3 text-sm font-semibold text-cream/80 hover:bg-white/10"
              >
                Agora nao
              </button>
              {actionLink ? (
                <a
                  href={actionLink}
                  target="_blank"
                  rel="noreferrer"
                  className="gold-button inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold uppercase tracking-wider"
                >
                  <FiExternalLink /> Abrir reagendamento
                </a>
              ) : (
                <a
                  href="mailto:studiodebelezathallytasilveira@gmail.com?subject=Reagendar%20agendamento"
                  className="gold-button inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold uppercase tracking-wider"
                >
                  Solicitar reagendamento
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function countServices(bookings) {
  return bookings.reduce((total, booking) => {
    if (!booking.service) return total + 1
    return total + booking.service.split(',').filter(Boolean).length
  }, 0)
}

function ClientLoyaltySummary({ bookings }) {
  const eligibleBookings = bookings.filter((booking) => booking.status !== 'cancelled')
  const completedBookings = eligibleBookings.filter((booking) => booking.serviceCompletedAt)
  const pendingBookings = eligibleBookings.filter((booking) => !booking.serviceCompletedAt)
  const stamps = countServices(completedBookings)
  const pendingStamps = countServices(pendingBookings)
  const visibleStamps = Math.min(stamps, 10)
  const recentBookings = completedBookings.slice(0, 5)

  return (
    <section className="pt-2">
      <div className="mb-4 flex items-center gap-3">
        <FiGift className="text-gold" />
        <h2 className="font-display text-2xl font-semibold">Fidelidade</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.82fr_1fr]">
        <LoyaltyCard stamps={visibleStamps} />

        <div className="gold-border rounded-lg bg-black/35 p-5 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-2 border-b border-white/10 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold-light/70">Resumo geral</p>
              <h3 className="mt-2 font-display text-3xl font-semibold text-gold-light">
                {stamps} {stamps === 1 ? 'selo liberado' : 'selos liberados'}
              </h3>
              {pendingStamps > 0 && (
                <p className="mt-2 text-sm text-amber-100">
                  {pendingStamps} {pendingStamps === 1 ? 'selo pendente' : 'selos pendentes'} aguardando confirmacao do studio.
                </p>
              )}
            </div>
            <span className="rounded-full border border-gold/25 bg-gold/10 px-4 py-2 text-sm font-bold text-gold-light">
              {Math.max(10 - visibleStamps, 0)} para completar
            </span>
          </div>

          <div className="mt-5">
            <h4 className="text-sm font-bold uppercase tracking-wider text-cream/60">Ultimos registros</h4>
            {recentBookings.length === 0 ? (
              <p className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-cream/55">
                Seus selos aparecem aqui quando o studio confirmar que o serviço foi realizado.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="break-words font-semibold text-cream">{booking.service || 'Servico'}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-gold-light/75">
                      {new Date(booking.scheduledAt).toLocaleDateString('pt-BR')} - {formatTime(booking.scheduledAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/#fidelidade"
            className="tap-gold mt-5 inline-flex items-center gap-2 rounded-lg border border-gold/25 px-4 py-3 text-sm font-semibold text-gold-light hover:bg-gold/10"
          >
            Ver seção fidelidade
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function MyBookingsPage() {
  const { bookings, loadingBookings, fetchBookings, cancelBooking } = useBooking()
  const [cancelling, setCancelling] = useState(null)
  const [modalState, setModalState] = useState({ type: null, booking: null })

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
  }, [bookings])

  const upcoming = sortedBookings.filter((booking) => booking.status !== 'cancelled' && new Date(booking.scheduledAt) >= new Date())
  const history = sortedBookings.filter((booking) => booking.status === 'cancelled' || new Date(booking.scheduledAt) < new Date())

  const openCancelModal = (booking) => setModalState({ type: 'cancel', booking })
  const openRescheduleModal = (booking) => setModalState({ type: 'reschedule', booking })
  const closeModal = () => setModalState({ type: null, booking: null })

  const confirmCancel = async (booking) => {
    setCancelling(booking.id)
    const result = await cancelBooking(booking.id)
    setCancelling(null)
    if (result.ok) closeModal()
  }

  return (
    <>
      <Navbar />
      <main className="premium-section min-h-screen py-28 md:py-32">
        <div className="section-shell">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Link to="/" className="tap-gold mb-5 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-cream/70 hover:text-gold-light">
                <FiArrowLeft /> Voltar ao site
              </Link>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-gold-light/70">Área do cliente</p>
              <h1 className="mt-2 font-display text-4xl font-semibold text-gold-light md:text-5xl">Meus Agendamentos</h1>
              <p className="mt-3 max-w-2xl text-cream/60">
                Acompanhe seus horarios reservados e cancele quando precisar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchBookings()}
              className="tap-gold inline-flex items-center justify-center gap-2 rounded-lg border border-gold/25 px-4 py-3 text-sm font-semibold text-gold-light hover:bg-gold/10"
            >
              <FiRefreshCw /> Atualizar
            </button>
          </div>

          {loadingBookings ? (
            <div className="gold-border rounded-lg bg-black/35 p-8 text-center text-cream/60">Carregando agendamentos...</div>
          ) : bookings.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-10">
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <FiScissors className="text-gold" />
                  <h2 className="font-display text-2xl font-semibold">Proximos horarios</h2>
                </div>
                {upcoming.length === 0 ? (
                  <div className="rounded-lg border border-white/10 bg-black/25 p-5 text-sm text-cream/55">
                    Voce nao tem agendamentos futuros.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcoming.map((booking) => (
                      <BookingItem
                        key={booking.id}
                        booking={booking}
                        cancelling={cancelling}
                        onCancel={openCancelModal}
                        onReschedule={openRescheduleModal}
                      />
                    ))}
                  </div>
                )}
              </section>

              {history.length > 0 && (
                <section>
                  <h2 className="mb-4 font-display text-2xl font-semibold text-cream/85">Historico</h2>
                  <div className="space-y-4">
                    {history.map((booking) => (
                      <BookingItem
                        key={booking.id}
                        booking={booking}
                        cancelling={cancelling}
                        onCancel={openCancelModal}
                        onReschedule={openRescheduleModal}
                      />
                    ))}
                  </div>
                </section>
              )}

              <ClientLoyaltySummary bookings={sortedBookings} />
            </div>
          )}

          {!loadingBookings && bookings.length === 0 && (
            <div className="mt-10">
              <ClientLoyaltySummary bookings={[]} />
            </div>
          )}
        </div>
      </main>
      <Footer />
      <FloatingButtons />
      <ActionModal
        booking={modalState.booking}
        type={modalState.type}
        cancelling={cancelling}
        onClose={closeModal}
        onConfirmCancel={confirmCancel}
      />
    </>
  )
}
