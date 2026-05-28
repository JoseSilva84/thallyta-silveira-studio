import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'react-toastify'
import { allServices } from '../../data/services.js'
import { timeSlots } from '../../data/timeSlots.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useBooking } from '../../context/BookingContext.jsx'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import BookingCalendar from '../ui/BookingCalendar.jsx'
import TimeSlot from '../ui/TimeSlot.jsx'

export default function Booking() {
  const { user, setLoginOpen } = useAuth()
  const { selectedServices, toggleService, confirmBooking } = useBooking()
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('09:00')
  const [name, setName] = useState('')

  const progress = useMemo(
    () => [selectedServices.length > 0, Boolean(date), Boolean(time), Boolean(name || user)].filter(Boolean).length,
    [selectedServices, date, time, name, user],
  )

  const submit = () => {
    if (!selectedServices.length) return toast.warn('Escolha pelo menos um serviço.')
    if (!user) {
      setLoginOpen(true)
      return toast.info('Entre para confirmar seu agendamento.')
    }
    confirmBooking({ customer: name || user.name, services: selectedServices, date, time })
    toast.success(`Agendamento confirmado! Até logo, ${name || user.name}!`)
  }

  return (
    <section id="agendamento" className="premium-section py-16 md:py-20">
      <div className="section-shell">
        <SectionTitle eyebrow="Agendamento" title="Reserve seu horário" text="Monte seu atendimento em poucos passos." />
        <Reveal>
          <div className="gold-border overflow-hidden rounded-lg bg-dark-card/80 p-4 md:p-6 xl:p-8">
            <div className="mb-7 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className={`h-2 rounded-full ${progress >= step ? 'silver-glow bg-gold' : 'bg-white/14'}`} />
              ))}
            </div>

            <div className="grid min-w-0 gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(320px,390px)]">
              <div className="min-w-0 space-y-8">
                <section aria-labelledby="booking-services">
                  <h3 id="booking-services" className="mb-4 font-display text-3xl">1. Serviços</h3>
                  <div className="grid min-w-0 gap-3 md:grid-cols-2">
                    {allServices.map((service) => (
                      <label key={service.id} className="tap-gold flex min-w-0 cursor-pointer items-start gap-3 rounded-md border border-dark-border bg-white/10 p-3 text-sm backdrop-blur">
                        <input type="checkbox" checked={selectedServices.some((item) => item.id === service.id)} onChange={() => toggleService(service)} className="mt-1 shrink-0 accent-gold" />
                        <span className="min-w-0">
                          <span className="block break-words font-bold">{service.name}</span>
                          <span className="block break-words text-gold-light">{service.price}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>

                <section aria-labelledby="booking-date">
                  <h3 id="booking-date" className="mb-4 font-display text-3xl">2. Data</h3>
                  <BookingCalendar selectedDate={date} onSelect={setDate} />
                </section>

                <section aria-labelledby="booking-time">
                  <h3 id="booking-time" className="mb-4 font-display text-3xl">3. Horário</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {timeSlots.map((slot) => <TimeSlot key={slot} time={slot} selected={time === slot} onClick={() => setTime(slot)} />)}
                  </div>
                </section>
              </div>

              <aside className="min-w-0 rounded-lg border border-gold/20 bg-white/10 p-4 backdrop-blur md:p-5 xl:sticky xl:top-28 xl:self-start">
                <h3 className="font-display text-3xl">4. Confirmação</h3>
                <label className="mt-5 block text-sm text-cream/75">
                  Nome
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder={user?.name || 'Seu nome'} className="mt-2 w-full rounded-md border border-dark-border bg-black/35 px-4 py-3 text-cream" />
                </label>
                <div className="mt-5 space-y-3 text-sm text-cream/75">
                  <p><strong className="text-cream">Serviços:</strong> {selectedServices.map((item) => item.name).join(', ') || 'Nenhum selecionado'}</p>
                  <p><strong className="text-cream">Data:</strong> {date}</p>
                  <p><strong className="text-cream">Hora:</strong> {time}</p>
                </div>
                <button onClick={submit} className="gold-button mt-6 w-full rounded-md px-5 py-3 font-bold">Confirmar</button>
              </aside>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
