import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useBooking } from '../../context/BookingContext.jsx'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import LoyaltyCard from '../ui/LoyaltyCard.jsx'

export default function Loyalty() {
  const { user, setLoginOpen } = useAuth()
  const { bookings } = useBooking()
  const [stamps, setStamps] = useState(4)

  useEffect(() => {
    setStamps(Number(localStorage.getItem('loyaltyStamps') || 4))
  }, [bookings])

  return (
    <section id="fidelidade" className="premium-section py-16 md:py-20">
      <div className="section-shell">
        <SectionTitle eyebrow="Fidelidade" title="Recompensas Especiais" />
        <Reveal>
          {user ? (
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1fr]">
              <LoyaltyCard stamps={stamps} />
              <div className="gold-border rounded-lg bg-dark-card/80 p-6">
                <h3 className="font-display text-3xl">Histórico de visitas</h3>
                <div className="mt-5 space-y-3">
                  {(bookings.length ? bookings : [
                    { id: 'a', date: '2026-05-20', time: '14:15', services: [{ name: 'Manutenção' }] },
                    { id: 'b', date: '2026-05-10', time: '09:45', services: [{ name: 'Lavar e escovar' }] },
                  ]).slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between rounded-md border border-dark-border bg-white/10 p-4 text-sm backdrop-blur">
                      <span>{booking.services.map((service) => service.name).join(', ')}</span>
                      <span className="text-gold-light">{booking.date} · {booking.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid items-stretch gap-8 lg:grid-cols-[0.85fr_1fr]">
              <LoyaltyCard stamps={5} preview />
              <div className="gold-border flex h-full flex-col justify-center rounded-lg bg-dark-card/80 p-6 md:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold-light">Como funciona</p>
                <h3 className="mt-3 font-display text-4xl font-semibold">Seu cuidado rende presentes</h3>
                <p className="mt-5 leading-8 text-cream/72">
                  A cada visita, você ganha um selo no cartão fidelidade. Ao completar 10 selos, desbloqueia um benefício especial no studio.
                </p>
                <div className="mt-6 grid gap-3 text-sm text-cream/72 sm:grid-cols-3">
                  {['Agende', 'Ganhe selos', 'Resgate'].map((item, index) => (
                    <div key={item} className="loyalty-step rounded-lg border border-gold/20 bg-white/10 p-4 text-center backdrop-blur">
                      <span className="mx-auto mb-3 grid size-9 place-items-center rounded-full bg-gold text-sm font-bold text-dark">{index + 1}</span>
                      <strong className="text-cream">{item}</strong>
                    </div>
                  ))}
                </div>
                <button onClick={() => setLoginOpen(true)} className="gold-button mt-7 rounded-md px-6 py-3 font-bold">Entrar e acompanhar</button>
              </div>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}
