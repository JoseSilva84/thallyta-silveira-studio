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
            <div className="gold-border mx-auto max-w-xl rounded-lg bg-dark-card/80 p-8 text-center">
              <p className="text-cream/72">Entre para visualizar seus selos, histórico e benefícios.</p>
              <button onClick={() => setLoginOpen(true)} className="gold-button mt-5 rounded-md px-6 py-3 font-bold">Entrar</button>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}
