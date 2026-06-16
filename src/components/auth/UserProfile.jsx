import { useState, useRef, useEffect } from 'react'
import { FiChevronDown, FiLogOut, FiStar, FiCalendar, FiPhone, FiEdit2, FiX, FiGrid } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import UserAvatar from './UserAvatar.jsx'
import {
  formatBrazilWhatsappDisplay,
  formatBrazilWhatsappInput,
  normalizeBrazilWhatsapp,
  onlyDigits,
} from '../../utils/phone.js'

export default function UserProfile() {
  const [open, setOpen] = useState(false)
  const [editingWhatsapp, setEditingWhatsapp] = useState(false)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const { user, isAdmin, logout, loading, updateWhatsapp } = useAuth()
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (!user) return null

  const startWhatsappEditing = () => {
    setPhone(formatBrazilWhatsappDisplay(user.whatsappPhone))
    setError('')
    setEditingWhatsapp(true)
  }

  const cancelWhatsappEditing = () => {
    setEditingWhatsapp(false)
    setError('')
  }

  const saveWhatsapp = async (event) => {
    event.preventDefault()
    const digits = onlyDigits(phone)

    if (digits.length < 10 || digits.length > 11) {
      setError('Informe um WhatsApp valido com DDD.')
      return
    }

    const result = await updateWhatsapp(normalizeBrazilWhatsapp(phone))
    if (result.ok) {
      setEditingWhatsapp(false)
      setError('')
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="tap-gold flex items-center gap-2 rounded-full border border-gold/30 bg-white/5 py-1 pl-1 pr-3 text-sm"
      >
        <UserAvatar user={user} className="silver-glow size-8 rounded-full" />
        <span className="hidden max-w-24 truncate md:block">{user.name}</span>
        <FiChevronDown />
      </button>
      {open && (
        <div className="gold-border absolute right-0 mt-3 w-72 rounded-lg bg-dark-card/95 p-2 shadow-xl">
          {!isAdmin && (
            editingWhatsapp ? (
              <form onSubmit={saveWhatsapp} className="mb-2 rounded-md border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-cream/70">Editar WhatsApp</span>
                  <button type="button" onClick={cancelWhatsappEditing} className="text-cream/50 hover:text-cream" aria-label="Cancelar edicao">
                    <FiX />
                  </button>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(formatBrazilWhatsappInput(event.target.value))}
                  placeholder="(DDD) numero"
                  inputMode="numeric"
                  autoFocus
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-cream outline-none focus:border-gold/50"
                />
                <p className="mt-2 text-[11px] leading-relaxed text-cream/45">
                  Digite seu numero normalmente, com DDD e o nono digito quando houver.
                </p>
                {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-3 w-full rounded-lg bg-gold px-3 py-2 text-xs font-bold text-dark disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar numero'}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={startWhatsappEditing}
                className="tap-gold mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-cream/60 hover:bg-white/10"
              >
                <FiPhone className="text-gold" />
                <span className="flex-1">{user.whatsappPhone ? formatBrazilWhatsappDisplay(user.whatsappPhone) : 'Adicionar WhatsApp'}</span>
                <FiEdit2 />
              </button>
            )
          )}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="tap-gold flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-gold-light hover:bg-white/10"
            >
              <FiGrid /> Painel administrativo
            </Link>
          )}
          <Link
            to="/meus-agendamentos"
            onClick={() => setOpen(false)}
            className="tap-gold flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-white/10"
          >
            <FiCalendar /> Meus Agendamentos
          </Link>
          <a href="#fidelidade" onClick={() => setOpen(false)} className="tap-gold flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-white/10">
            <FiStar /> Fidelidade
          </a>
          <button onClick={logout} className="tap-gold flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-white/10">
            <FiLogOut /> Sair
          </button>
        </div>
      )}
    </div>
  )
}
