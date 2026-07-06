import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiHeart, FiX } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export default function CrmProfilePromptModal() {
  const { user, authHydrated, getToken } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [shouldPrompt, setShouldPrompt] = useState(false)
  const [checkedUserId, setCheckedUserId] = useState(null)
  const [closing, setClosing] = useState(false)

  const canCheck = useMemo(() => (
    authHydrated
    && user?.id
    && user.role !== 'ADMIN'
    && !location.pathname.startsWith('/agendar')
    && !location.pathname.startsWith('/preferencias')
  ), [authHydrated, location.pathname, user])

  const fetchPromptState = useCallback(async () => {
    if (!canCheck) {
      setShouldPrompt(false)
      return
    }

    try {
      const res = await fetch(`${API}/crm/profile`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao verificar perfil CRM.')
      setCheckedUserId(user.id)
      setShouldPrompt(Boolean(data.shouldPrompt))
    } catch {
      setShouldPrompt(false)
    }
  }, [canCheck, getToken, user])

  useEffect(() => {
    if (checkedUserId === user?.id) return
    fetchPromptState()
  }, [checkedUserId, fetchPromptState, user])

  useEffect(() => {
    if (!canCheck) setShouldPrompt(false)
  }, [canCheck])

  if (!shouldPrompt) return null

  const closePrompt = async () => {
    setClosing(true)
    try {
      await fetch(`${API}/crm/profile/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
    } catch {
      // Fechar o modal nao deve bloquear a navegacao da cliente.
    } finally {
      setShouldPrompt(false)
      setClosing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/65 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gold/25 bg-[#100c08] p-5 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-gold-light">
            <FiHeart size={20} />
          </div>
          <button
            type="button"
            onClick={closePrompt}
            disabled={closing}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-cream/45 transition hover:border-white/20 hover:text-cream disabled:opacity-50"
            aria-label="Fechar preferencias"
          >
            <FiX />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold/70">Preferencias do Studio</p>
          <h2 className="mt-2 font-display text-3xl text-gold-light">Quer personalizar seu atendimento?</h2>
          <p className="mt-3 text-sm leading-relaxed text-cream/60">
            Responda algumas perguntas rapidas para o Studio lembrar suas preferencias. Isso e opcional e nao muda o agendamento rapido.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setShouldPrompt(false)
              navigate('/preferencias')
            }}
            className="gold-button flex-1 rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wider"
          >
            Preencher agora
          </button>
          <button
            type="button"
            onClick={closePrompt}
            disabled={closing}
            className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-cream/55 transition hover:border-white/20 hover:text-cream disabled:opacity-50"
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  )
}
