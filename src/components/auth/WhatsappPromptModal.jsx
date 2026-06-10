import { useEffect, useMemo, useState } from 'react'
import { FiPhone, FiX } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext.jsx'
import { formatBrazilWhatsappInput, normalizeBrazilWhatsapp, onlyDigits } from '../../utils/phone.js'

export default function WhatsappPromptModal() {
  const { user, loading, updateWhatsapp } = useAuth()
  const [dismissedFor, setDismissedFor] = useState(null)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  const shouldOpen = useMemo(() => {
    return Boolean(user?.id && user.role !== 'ADMIN' && !user.whatsappPhone && dismissedFor !== user.id)
  }, [user, dismissedFor])

  useEffect(() => {
    if (shouldOpen) {
      setPhone('')
      setError('')
    }
  }, [shouldOpen])

  if (!shouldOpen) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const digits = onlyDigits(phone)
    if (digits.length < 10 || digits.length > 11) {
      setError('Informe um WhatsApp valido com DDD.')
      return
    }

    const result = await updateWhatsapp(normalizeBrazilWhatsapp(phone))
    if (result.ok) {
      setDismissedFor(user.id)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="gold-border w-full max-w-md rounded-2xl bg-dark-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold/70">WhatsApp</p>
            <h2 className="mt-2 font-display text-3xl text-gold-light">Complete seu contato</h2>
          </div>
          <button
            type="button"
            onClick={() => setDismissedFor(user.id)}
            className="tap-gold grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-cream/70 hover:text-cream"
            aria-label="Fechar"
          >
            <FiX />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-cream/65">
          Informe seu WhatsApp para receber confirmacoes e avisos dos seus agendamentos.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="relative">
            <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50" />
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(formatBrazilWhatsappInput(event.target.value))}
              placeholder="WhatsApp com DDD"
              inputMode="numeric"
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-cream placeholder-cream/30 outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="gold-button tap-gold flex-1 rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar WhatsApp'}
            </button>
            <button
              type="button"
              onClick={() => setDismissedFor(user.id)}
              className="tap-gold rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-cream/70 hover:bg-white/5 hover:text-cream"
            >
              Agora nao
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
