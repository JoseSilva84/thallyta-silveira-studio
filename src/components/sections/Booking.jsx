import { useEffect, useMemo, useState } from 'react'
import { FiCheck, FiCalendar, FiCheckCircle } from 'react-icons/fi'
import { toast } from 'react-toastify'
import Cal, { getCalApi } from '@calcom/embed-react'
import { allServices } from '../../data/services.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useBooking } from '../../context/BookingContext.jsx'
import Reveal from '../ui/Reveal.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'

const CAL_USERNAME = import.meta.env.VITE_CAL_USERNAME || 'thallyta-silveira-hxfjrf'
const CAL_EVENT_SLUG = import.meta.env.VITE_CAL_EVENT_SLUG || '30min'
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

export default function Booking() {
  const { user, setLoginOpen, getToken } = useAuth()
  const { selectedServices, toggleService, fetchBookings } = useBooking()
  const [showCal, setShowCal] = useState(false)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)

  // Inicializa a API do Cal.com embed e escuta o evento de booking concluído
  useEffect(() => {
    (async () => {
      const cal = await getCalApi()
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
        action: 'bookingSuccessful',
        callback: () => {
          // Esconde o Cal.com e mostra nossa tela de confirmação
          setBookingConfirmed(true)
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
  }, [getToken, fetchBookings])

  // Monta a string de serviços selecionados para enviar como metadata ao Cal.com
  const servicesParam = useMemo(
    () => selectedServices.map((s) => s.name).join(', '),
    [selectedServices],
  )

  const handleProceed = () => {
    if (!selectedServices.length) {
      return toast.warn('Escolha pelo menos um serviço.')
    }
    if (!user) {
      setLoginOpen(true)
      return toast.info('Entre na sua conta para agendar.')
    }
    setShowCal(true)
    setBookingConfirmed(false)
  }

  const handleNewBooking = () => {
    setShowCal(false)
    setBookingConfirmed(false)
  }

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

  return (
    <section id="agendamento" className="premium-section py-16 md:py-20">
      <div className="section-shell">
        <SectionTitle eyebrow="Agendamento" title="Reserve seu horário" text="Monte seu atendimento em poucos passos." />
        <Reveal>
          <div className="relative">
            <div className="absolute -inset-4 z-0 rounded-[3rem] bg-gradient-to-b from-gold/10 to-transparent opacity-40 blur-2xl"></div>
            <div className="gold-border relative z-10 overflow-hidden rounded-[2.5rem] bg-black/40 p-5 backdrop-blur-xl md:p-8 lg:p-12">

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
                      <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Serviços</span>
                      <span className="mt-1 block text-lg font-semibold text-cream">{servicesParam}</span>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent"></div>
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Cliente</span>
                      <span className="mt-1 block font-medium text-cream">{user?.name}</span>
                      <span className="block text-sm text-cream/50">{user?.email}</span>
                    </div>
                    {totalEstimado > 0 && (
                      <>
                        <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent"></div>
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Valor Estimado</span>
                          <span className="mt-1 block text-lg font-semibold text-gold">{`R$ ${totalEstimado.toFixed(2).replace('.', ',')}`}</span>
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

              ) : !showCal ? (
                /* ─── PASSO 1: Seleção de Serviços ─── */
                <div className="space-y-8">
                  <section aria-labelledby="booking-services">
                    <h3 id="booking-services" className="mb-4 font-display text-3xl">1. Escolha seus serviços</h3>
                    <p className="mb-6 text-cream/60 text-sm">Selecione um ou mais serviços que deseja agendar.</p>
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
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </section>

                  {/* Resumo e botão */}
                  <div className="rounded-[2rem] border border-gold/20 bg-gradient-to-b from-dark-card/90 to-dark/95 p-6 shadow-2xl backdrop-blur-md md:p-8">
                    <h3 className="font-display text-2xl">Resumo</h3>
                    <div className="mt-4 space-y-3 rounded-xl border border-white/5 bg-white/5 p-5 text-sm">
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Serviços Selecionados</span>
                        <span className="mt-1 block font-medium text-cream">
                          {selectedServices.map((item) => item.name).join(', ') || 'Nenhum selecionado'}
                        </span>
                      </div>
                      {selectedServices.length > 0 && (
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-wider text-gold-light/80">Estimativa de Valor</span>
                          <span className="mt-1 block font-medium text-cream">
                            {totalEstimado > 0 ? `R$ ${totalEstimado.toFixed(2).replace('.', ',')}` : 'Consultar preços variáveis'}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleProceed}
                      className="gold-button mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(217,177,92,0.25)]"
                    >
                      <FiCalendar className="text-lg" />
                      Escolher Data e Horário
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── PASSO 2: Widget Cal.com ─── */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-3xl">2. Escolha data e horário</h3>
                    <button
                      onClick={() => setShowCal(false)}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-cream/70 transition-colors hover:border-gold/30 hover:text-gold"
                    >
                      ← Voltar aos serviços
                    </button>
                  </div>

                  {/* Serviços selecionados - chip bar */}
                  <div className="flex flex-wrap gap-2">
                    {selectedServices.map((s) => (
                      <span key={s.id} className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-light">
                        {s.name}
                      </span>
                    ))}
                  </div>

                  {/* Aviso de rolagem */}
                  <div className="flex items-center gap-2 rounded-lg bg-gold/10 p-3 text-sm text-gold-light">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20">↓</span>
                    Dica: Após selecionar o dia, role a lista de horários para baixo para ver mais opções.
                  </div>

                  {/* Widget inline do Cal.com */}
                  <div className="overflow-hidden rounded-2xl border border-white/10 relative">
                    <Cal
                      calLink={`${CAL_USERNAME}/${CAL_EVENT_SLUG}`}
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
