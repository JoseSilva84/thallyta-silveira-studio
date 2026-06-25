import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FiCalendar, FiEdit2, FiGrid, FiHome, FiMenu, FiUser, FiX, FiLogOut, FiPhone } from 'react-icons/fi'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import LoginModal from '../auth/LoginModal.jsx'
import UserProfile from '../auth/UserProfile.jsx'
import UserAvatar from '../auth/UserAvatar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  formatBrazilWhatsappDisplay,
  formatBrazilWhatsappInput,
  normalizeBrazilWhatsapp,
  onlyDigits,
} from '../../utils/phone.js'

const links = [
  ['Início', '#inicio'],
  ['Galeria', '#galeria'],
  ['Agenda', '#agenda'],
  ['Serviços', '#servicos'],
  ['Fidelidade', '#fidelidade'],
  ['Dúvidas', '#duvidas'],
  ['Localização', '#localizacao'],
]

const mobileLinks = [
  ['Home', '#inicio', FiHome],
  ['Galeria', '#galeria', FiGrid],
  ['Agenda', '#agenda', FiCalendar],
  ['Serviços', '#servicos', FiCalendar],
  ['Perfil', '#fidelidade', FiUser],
]

const sectionIds = links.map(([, href]) => href.slice(1))
const STUDIO_TIME_ZONE = 'America/Fortaleza'

const getAnchorScrollTop = (element) => {
  if (!element) return 0
  const styles = window.getComputedStyle(element)
  const sectionPaddingTop = Number.parseFloat(styles.paddingTop) || 0
  const headerOffset = window.matchMedia('(min-width: 1024px)').matches
    ? 92
    : window.matchMedia('(min-width: 768px)').matches
      ? 72
      : 28

  return Math.max(element.getBoundingClientRect().top + window.scrollY + sectionPaddingTop - headerOffset, 0)
}

import { getStudioOpenStatus } from '../../utils/studioHours.js'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('inicio')
  const [open, setOpen] = useState(false)
  const [studioStatus, setStudioStatus] = useState(getStudioOpenStatus)
  const [editingWhatsapp, setEditingWhatsapp] = useState(false)
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const { user, isAdmin, setLoginOpen, logout, loading, updateWhatsapp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const updateStatus = () => setStudioStatus(getStudioOpenStatus())
    updateStatus()
    const interval = window.setInterval(updateStatus, 60 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12)

      const probeLine = window.scrollY + Math.min(window.innerHeight * 0.42, 360)
      let current = sectionIds[0]

      for (const id of sectionIds) {
        const element = document.getElementById(id)
        if (element && element.offsetTop <= probeLine) current = id
      }

      setActiveSection(current)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  useEffect(() => {
    if (location.pathname !== '/' || !location.hash) return

    const id = location.hash.slice(1)
    const scrollToHashSection = () => {
      const element = document.getElementById(id)
      if (!element) return
      window.scrollTo({ top: getAnchorScrollTop(element), behavior: 'smooth' })
      setActiveSection(id)
    }

    const timeout = window.setTimeout(scrollToHashSection, 80)
    return () => window.clearTimeout(timeout)
  }, [location.hash, location.pathname])

  const isActive = (href) => activeSection === href.slice(1)
  const statusDotClass = studioStatus.isOpen ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]' : 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.55)]'
  const statusTextClass = studioStatus.isOpen ? 'text-emerald-200' : 'text-red-200'
  const statusChipClass = studioStatus.isOpen
    ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_18px_rgba(52,211,153,0.12)]'
    : 'border-red-300/25 bg-red-400/10 text-red-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_18px_rgba(248,113,113,0.10)]'

  const handleAnchorClick = (event, href, afterScroll) => {
    const id = href?.startsWith('#') ? href.slice(1) : ''
    const element = id ? document.getElementById(id) : null
    if (!element) {
      event.preventDefault()
      afterScroll?.()
      if (id) navigate(`/${href}`)
      return
    }

    event.preventDefault()
    afterScroll?.()
    window.history.pushState(null, '', href)
    window.scrollTo({ top: getAnchorScrollTop(element), behavior: 'smooth' })
    setActiveSection(id)
  }

  const startWhatsappEditing = () => {
    setPhone(formatBrazilWhatsappDisplay(user?.whatsappPhone))
    setPhoneError('')
    setEditingWhatsapp(true)
  }

  const saveWhatsapp = async (event) => {
    event.preventDefault()
    const digits = onlyDigits(phone)

    if (digits.length < 10 || digits.length > 11) {
      setPhoneError('Informe um WhatsApp válido com DDD.')
      return
    }

    const result = await updateWhatsapp(normalizeBrazilWhatsapp(phone))
    if (result.ok) {
      setEditingWhatsapp(false)
      setPhoneError('')
    } else {
      setPhoneError(result.error)
    }
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-0 pt-0 transition-all duration-300 md:px-4 md:pt-3 pointer-events-none">
        <nav className="section-shell flex w-full h-16 md:h-20 items-center justify-end md:justify-between pointer-events-auto">
          {/* Desktop & Tablet Nav Bar */}
          <div className={`silver-nav hidden md:flex w-full items-center justify-between rounded-full px-5 py-3 transition ${scrolled ? 'shadow-2xl' : ''}`}>
            <a
              href="#inicio"
              onClick={(event) => handleAnchorClick(event, '#inicio')}
              className={`tap-gold flex items-center gap-3 rounded-full px-1 py-1 ${isActive('#inicio') ? 'brand-active' : ''}`}
              aria-label={`Studio de Beleza Thallyta Silveira - ${studioStatus.label}`}
              aria-current={isActive('#inicio') ? 'page' : undefined}
              title={`${studioStatus.label} - ${studioStatus.detail}`}
            >
              <div className="relative">
                <span className="silver-glow grid size-11 place-items-center rounded-full border border-gold/50 bg-black/20 font-display text-xl font-bold text-gold-light">TS</span>
                <span className="absolute -bottom-0.5 -right-0.5 flex size-3">
                  {studioStatus.isOpen && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${statusDotClass}`}></span>}
                  <span className={`relative inline-flex size-3 rounded-full ${statusDotClass}`}></span>
                </span>
              </div>
              <div className="hidden sm:flex flex-col justify-center">
                <span className="font-display text-xl font-semibold text-cream leading-tight">Thallyta Silveira</span>
                <span className={`mt-0.5 text-[0.6rem] font-bold tracking-[0.2em] uppercase ${statusTextClass} opacity-80`}>
                  {studioStatus.isOpen ? 'Aberto' : 'Fechado'}
                </span>
              </div>
            </a>

            <div className="hidden items-center gap-2 lg:flex">
              {links.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={(event) => handleAnchorClick(event, href)}
                  className={`nav-link px-3 py-2 text-sm ${isActive(href) ? 'active' : ''}`}
                  aria-current={isActive(href) ? 'page' : undefined}
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <UserProfile />
              ) : (
                <button onClick={() => setLoginOpen(true)} className="gold-button hidden rounded-md px-4 py-2 text-sm font-bold sm:block">
                  Entrar
                </button>
              )}
              <button onClick={() => setOpen(true)} className="tap-gold rounded-md border border-gold/30 bg-white/10 p-2 text-gold-light lg:hidden" aria-label="Abrir menu">
                <FiMenu className="size-5" />
              </button>
            </div>
          </div>

          {/* Mobile Hamburger Button (Top Right) */}
          <button onClick={() => setOpen(true)} className="tap-gold ml-auto rounded-xl border border-gold/30 bg-black/40 backdrop-blur-md p-2.5 text-gold-light shadow-lg md:hidden" aria-label="Abrir menu">
            <FiMenu className="size-6" />
          </button>
        </nav>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        >
          <aside
            className="frosted-panel overflow-y-auto ml-auto h-full w-80 max-w-[86vw] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <span className="shrink-0 font-display text-2xl leading-none text-gold-light">TS</span>
                <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  <span className={`size-2 rounded-full ${statusDotClass}`} aria-hidden="true"></span>
                  <span className={statusTextClass}>{studioStatus.label}</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="tap-gold rounded-md p-2 text-cream">
                <FiX />
              </button>
            </div>
            <div className="grid gap-2">
              {links.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={(event) => handleAnchorClick(event, href, () => setOpen(false))}
                  className={`nav-link rounded-md px-3 py-3 text-cream/80 ${isActive(href) ? 'active' : ''}`}
                  aria-current={isActive(href) ? 'page' : undefined}
                >
                  {label}
                </a>
              ))}
              {!user ? (
                <button
                  onClick={() => {
                    setOpen(false)
                    setLoginOpen(true)
                  }}
                  className="gold-button mt-4 rounded-md px-4 py-3 font-bold"
                >
                  Entrar
                </button>
              ) : (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="mb-3 px-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gold-light/70">
                      Sua Conta
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <UserAvatar user={user} className="silver-glow size-8 rounded-full text-xs" />
                      <p className="text-sm text-cream/90 truncate">
                        {user.name}
                      </p>
                    </div>
                  </div>
                  {!isAdmin && (
                    editingWhatsapp ? (
                      <form onSubmit={saveWhatsapp} className="mb-2 rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-cream/70">Editar WhatsApp</span>
                          <button
                            type="button"
                            onClick={() => setEditingWhatsapp(false)}
                            className="text-cream/50 hover:text-cream"
                            aria-label="Cancelar edição"
                          >
                            <FiX />
                          </button>
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(event) => setPhone(formatBrazilWhatsappInput(event.target.value))}
                          placeholder="WhatsApp com DDD"
                          inputMode="numeric"
                          autoFocus
                          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-cream outline-none focus:border-gold/50"
                        />
                        {phoneError && <p className="mt-2 text-xs text-red-400">{phoneError}</p>}
                        <button
                          type="submit"
                          disabled={loading}
                          className="mt-3 w-full rounded-lg bg-gold px-3 py-2 text-xs font-bold text-dark disabled:opacity-50"
                        >
                          {loading ? 'Salvando...' : 'Salvar número'}
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={startWhatsappEditing}
                        className="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-cream/80 hover:bg-white/5 hover:text-cream"
                      >
                        <FiPhone className="text-gold" />
                        <span className="flex-1">
                          {user.whatsappPhone ? formatBrazilWhatsappDisplay(user.whatsappPhone) : 'Adicionar WhatsApp'}
                        </span>
                        <FiEdit2 className="text-cream/50" />
                      </button>
                    )
                  )}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-3 font-semibold text-gold-light hover:bg-white/5"
                    >
                      <FiGrid className="text-gold" /> Painel administrativo
                    </Link>
                  )}
                  <Link
                    to="/meus-agendamentos"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-cream/80 hover:bg-white/5 hover:text-cream"
                  >
                    <FiCalendar className="text-gold" /> Meus Agendamentos
                  </Link>
                  <button
                    onClick={() => {
                      setOpen(false)
                      logout()
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-cream/80 hover:bg-white/5 hover:text-red-400"
                  >
                    <FiLogOut className="text-gold" /> Sair
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <nav className="silver-nav fixed inset-x-4 bottom-2 z-50 mx-auto max-w-sm rounded-2xl p-1.5 md:hidden" aria-label="Navegação principal mobile">
        <div className="grid grid-cols-5 gap-1">
          {mobileLinks.map(([label, href, Icon]) => {
            const active = isActive(href)
            return (
              <a
                key={href}
                href={href}
                onClick={(e) => {
                  if (label === 'Perfil') {
                    e.preventDefault();
                    if (!user) {
                      setLoginOpen(true);
                    } else {
                      navigate('/meus-agendamentos');
                    }
                    return
                  }
                  handleAnchorClick(e, href)
                }}
                className={`relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-300 ${
                  active ? 'text-gold-light' : 'text-cream/50 hover:bg-white/5 hover:text-cream/90'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 z-0 rounded-xl border border-gold/20 bg-gold/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <Icon className={`relative z-10 transition-all duration-300 ${active ? 'text-[1.35rem] drop-shadow-[0_0_8px_rgba(247,230,168,0.5)]' : 'text-[1.25rem]'}`} />
                <span className="relative z-10 text-[0.65rem] font-bold tracking-wider uppercase">
                  {label}
                </span>
              </a>
            )
          })}
        </div>
      </nav>
      <LoginModal />
    </>
  )
}
