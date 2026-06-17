import { useBooking } from '../../context/BookingContext.jsx'
import { FiX, FiCheck } from 'react-icons/fi'
import { useEffect, useState } from 'react'

export default function FloatingCart() {
  const {
    selectedServices,
    clearServices,
    requestSchedule,
    isBookingDetailsStep,
    paymentType,
    setPaymentType,
  } = useBooking()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (selectedServices.length > 0) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [selectedServices.length])

  if (!isVisible || isBookingDetailsStep) return null

  // Calcula o total estimado
  const totalEstimado = selectedServices.reduce((sum, s) => {
    const match = s.price.match(/R\$\s*([\d.,]+)/)
    if (match) {
      return sum + parseFloat(match[1].replace('.', '').replace(',', '.'))
    }
    return sum
  }, 0)

  return (
    <div className="fixed bottom-[5.5rem] inset-x-4 z-[60] md:bottom-8 md:max-w-md md:mx-auto transition-all duration-500 animate-in slide-in-from-bottom-10 fade-in pointer-events-auto">
      <div className="bg-dark-card/95 border border-gold/30 backdrop-blur-xl shadow-2xl rounded-[1.5rem] p-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-gold-light font-bold text-xs uppercase tracking-wider">
            Serviços ({selectedServices.length})
          </span>
          <span className="text-cream font-bold">R$ {totalEstimado.toFixed(2).replace('.', ',')}</span>
        </div>
        
        <p className="text-xs text-cream/70 truncate mb-4 font-medium">
          {selectedServices.map(s => s.name).join(', ')}
        </p>

        {totalEstimado > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentType('deposit')}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                paymentType === 'deposit'
                  ? 'border-gold bg-gold/10 text-gold-light'
                  : 'border-white/10 bg-black/20 text-cream/70 hover:border-gold/30'
              }`}
            >
              <span className="block text-[0.62rem] font-bold uppercase tracking-wider">Entrada 30%</span>
              <span className="mt-0.5 block font-display text-lg">R$ {(totalEstimado * 0.3).toFixed(2).replace('.', ',')}</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentType('full')}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                paymentType === 'full'
                  ? 'border-gold bg-gold/10 text-gold-light'
                  : 'border-white/10 bg-black/20 text-cream/70 hover:border-gold/30'
              }`}
            >
              <span className="block text-[0.62rem] font-bold uppercase tracking-wider">Pagar tudo</span>
              <span className="mt-0.5 block font-display text-lg">R$ {totalEstimado.toFixed(2).replace('.', ',')}</span>
            </button>
          </div>
        )}
        
        <div className="flex gap-3">
          <button 
            onClick={clearServices}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-cream/80 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={requestSchedule}
            className="flex-1 py-2.5 rounded-xl gold-button flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-dark shadow-[0_0_15px_rgba(217,177,92,0.2)]"
          >
            <FiCheck className="text-sm" /> Pagar
          </button>
        </div>
      </div>
    </div>
  )
}
