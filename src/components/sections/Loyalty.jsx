import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useBooking } from '../../context/BookingContext.jsx'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import LoyaltyCard from '../ui/LoyaltyCard.jsx'

export default function Loyalty() {
  const { user, setLoginOpen } = useAuth()
  const { bookings } = useBooking()
  const [stamps, setStamps] = useState(0)
  const [pendingStamps, setPendingStamps] = useState(0)

  useEffect(() => {
    if (bookings && bookings.length > 0) {
      const countBookingServices = (booking) => (booking.service ? booking.service.split(',').filter(Boolean).length : 1)
      const eligibleBookings = bookings.filter((booking) => booking.status !== 'cancelled')
      const totalServices = eligibleBookings
        .filter((booking) => booking.serviceCompletedAt)
        .reduce((acc, booking) => acc + countBookingServices(booking), 0)
      const totalPending = eligibleBookings
        .filter((booking) => !booking.serviceCompletedAt)
        .reduce((acc, booking) => acc + countBookingServices(booking), 0)
      setStamps(totalServices)
      setPendingStamps(totalPending)
    } else {
      setStamps(0)
      setPendingStamps(0)
    }
  }, [bookings])

  return (
    <section id="fidelidade" className="premium-section py-6 md:py-8 lg:py-14">
      <div className="section-shell">
        <SectionTitle eyebrow="Fidelidade" title="Recompensas Especiais" />
        <Reveal>
          {user ? (
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1fr]">
              <LoyaltyCard stamps={stamps} />
              <div className="relative overflow-hidden rounded-[2.5rem] border border-gold/20 bg-black/40 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
                <div className="absolute -inset-10 z-0 bg-gradient-to-tr from-gold/5 via-transparent to-transparent opacity-50 blur-3xl"></div>
                <h3 className="relative z-10 font-display text-3xl">Histórico de visitas</h3>
                {pendingStamps > 0 && (
                  <p className="relative z-10 mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                    {pendingStamps} {pendingStamps === 1 ? 'selo pendente' : 'selos pendentes'} aguardando confirmacao do studio.
                  </p>
                )}
                <div className="relative z-10 mt-8 space-y-4">
                  {(bookings.length ? bookings : []).filter((booking) => booking.serviceCompletedAt).slice(0, 5).map((booking) => (
                    <div key={booking.id} className="group flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-5 transition-all hover:-translate-y-0.5 hover:border-gold/20 hover:bg-white/10 sm:flex-row sm:items-center">
                      <span className="font-semibold text-cream">{booking.service || 'Serviço'}</span>
                      <span className="mt-2 text-xs font-bold uppercase tracking-wider text-gold-light/80 sm:mt-0">
                        {new Date(booking.scheduledAt).toLocaleDateString('pt-BR')} · {new Date(booking.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid items-stretch gap-8 lg:grid-cols-[0.85fr_1fr]">
              <LoyaltyCard stamps={5} preview />
              <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-[2.5rem] border border-gold/20 bg-black/40 p-8 shadow-2xl backdrop-blur-xl sm:p-12">
                <div className="absolute -inset-10 z-0 bg-gradient-to-tr from-gold/5 via-transparent to-transparent opacity-50 blur-3xl"></div>
                
                <div className="relative z-10">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold-light/80">Como funciona</p>
                  <h3 className="mt-3 font-display text-4xl font-semibold leading-tight">Seu cuidado<br/><span className="text-gold-light italic">rende presentes</span></h3>
                  <p className="mt-5 text-lg leading-relaxed text-cream/80">
                    A cada visita, você ganha um selo no cartão fidelidade. Ao completar 10 selos, desbloqueia um benefício exclusivo no studio.
                  </p>
                  
                  <div className="mt-10 grid gap-4 sm:grid-cols-3">
                    {['Agende', 'Ganhe selos', 'Resgate'].map((item, index) => (
                      <div key={item} className="loyalty-step flex flex-col items-center rounded-2xl border border-white/5 bg-white/5 p-5 text-center transition-all hover:-translate-y-1 hover:border-gold/30 hover:bg-white/10">
                        <span className="mb-4 grid size-12 place-items-center rounded-full border border-gold-light/30 bg-gradient-to-br from-gold to-gold-light text-lg font-bold text-dark shadow-[0_0_15px_rgba(217,177,92,0.3)]">{index + 1}</span>
                        <strong className="text-sm font-bold uppercase tracking-wider text-cream">{item}</strong>
                      </div>
                    ))}
                  </div>
                  
                  <button onClick={() => setLoginOpen(true)} className="gold-button mt-10 w-full rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(217,177,92,0.25)]">
                    Entrar e acompanhar
                  </button>
                </div>
              </div>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}
