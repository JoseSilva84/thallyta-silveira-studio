import { useState, useRef, useEffect } from 'react'
import { FiChevronDown, FiLogOut, FiStar, FiCalendar, FiPhone } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function UserProfile() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="tap-gold flex items-center gap-2 rounded-full border border-gold/30 bg-white/5 py-1 pl-1 pr-3 text-sm"
      >
        <span className="silver-glow grid size-8 place-items-center rounded-full bg-gold font-bold text-dark">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-24 truncate md:block">{user.name}</span>
        <FiChevronDown />
      </button>
      {open && (
        <div className="gold-border absolute right-0 mt-3 w-56 rounded-lg bg-dark-card/90 p-2 shadow-xl">
          {user.whatsappPhone && (
            <div className="mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-cream/60">
              <FiPhone className="text-gold" /> {user.whatsappPhone}
            </div>
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
