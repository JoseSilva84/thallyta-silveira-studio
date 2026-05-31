import { useMemo, useState } from 'react'
import { FiCheck } from 'react-icons/fi'
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
          <div className="relative">
            <div className="absolute -inset-4 z-0 rounded-[3rem] bg-gradient-to-b from-gold/10 to-transparent opacity-40 blur-2xl"></div>
            <div className="gold-border relative z-10 overflow-hidden rounded-[2.5rem] bg-black/40 p-5 backdrop-blur-xl md:p-8 lg:p-12">
              <div className="mb-10 grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className={`h-1.5 rounded-full transition-all duration-500 ${progress >= step ? 'silver-glow bg-gradient-to-r from-gold to-gold-light shadow-[0_0_10px_rgba(217,177,92,0.4)]' : 'bg-white/10'}`} />
                ))}
              </div>

            <div className="grid min-w-0 gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(320px,390px)]">
              <div className="min-w-0 space-y-8">
                <section aria-labelledby="booking-services">
                  <h3 id="booking-services" className="mb-4 font-display text-3xl">1. Serviços</h3>
                  <div className="grid min-w-0 gap-4 md:grid-cols-2">
                    {allServices.map((service) => {
                      const isSelected = selectedServices.some((item) => item.id === service.id);
                      return (
                        <label key={service.id} className={`group tap-gold relative flex min-w-0 cursor-pointer items-start gap-4 rounded-[1.25rem] border p-4 backdrop-blur-md transition-all duration-300 ${isSelected ? 'border-gold bg-gold/10 shadow-[0_0_15px_rgba(217,177,92,0.15)]' : 'border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-gold/30 hover:bg-white/10'}`}>
                          <div className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[0.25rem] border transition-colors ${isSelected ? 'border-gold bg-gold text-dark' : 'border-white/30 bg-black/20'}`}>
                            {isSelected && <FiCheck className="size-3.5 stroke-[3]" />}
                          </div>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleService(service)} className="hidden" />
                          <span className="min-w-0 flex-1">
                            <span className={`block break-words font-display text-lg font-semibold transition-colors ${isSelected ? 'text-gold-light' : 'text-cream group-hover:text-gold-light'}`}>{service.name}</span>
                            <span className="block break-words text-sm font-medium text-cream/60">{service.price}</span>
                          </span>
                        </label>
                      );
                    })}
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

              <aside className="min-w-0 self-start rounded-[2rem] border border-gold/20 bg-gradient-to-b from-dark-card/90 to-dark/95 p-6 shadow-2xl backdrop-blur-md xl:sticky xl:top-28 xl:p-8">
                <h3 className="font-display text-3xl">4. Confirmação</h3>
                
                <div className="mt-8">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Nome Completo</label>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder={user?.name || 'Como gostaria de ser chamada?'} className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-cream outline-none transition-all focus:border-gold/60 focus:ring-1 focus:ring-gold/60" />
                </div>
                
                <div className="mt-8 space-y-4 rounded-xl border border-white/5 bg-white/5 p-5 text-sm">
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Serviços Selecionados</span>
                    <span className="mt-1 block font-medium text-cream">{selectedServices.map((item) => item.name).join(', ') || 'Nenhum selecionado'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Data</span>
                      <span className="mt-1 block font-medium text-cream">{date}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Horário</span>
                      <span className="mt-1 block font-medium text-cream">{time}</span>
                    </div>
                  </div>
                </div>
                
                <button onClick={submit} className="gold-button mt-8 flex w-full items-center justify-center rounded-xl px-5 py-4 text-sm font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(217,177,92,0.25)]">
                  Confirmar Agendamento
                </button>
              </aside>
            </div>
          </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
