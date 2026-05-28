import { useEffect, useState } from 'react'
import { FiCalendar, FiGrid, FiHome, FiMenu, FiUser, FiX } from 'react-icons/fi'
import LoginModal from '../auth/LoginModal.jsx'
import UserProfile from '../auth/UserProfile.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const links = [
  ['Início', '#inicio'],
  ['Sobre', '#sobre'],
  ['Serviços', '#servicos'],
  ['Galeria', '#galeria'],
  ['Agendamento', '#agendamento'],
  ['Fidelidade', '#fidelidade'],
  ['Localização', '#localizacao'],
]

const mobileLinks = [
  ['Home', '#inicio', FiHome],
  ['Serviços', '#servicos', FiGrid],
  ['Agendar', '#agendamento', FiCalendar],
  ['Perfil', '#fidelidade', FiUser],
]

const sectionIds = links.map(([, href]) => href.slice(1))

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('inicio')
  const [open, setOpen] = useState(false)
  const { user, setLoginOpen } = useAuth()

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

  const isActive = (href) => activeSection === href.slice(1)

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-0 pt-0 transition-all duration-300 md:px-4 md:pt-3">
        <nav className="section-shell flex h-20 items-center justify-between">
          <div className={`silver-nav flex w-full items-center justify-between rounded-none px-4 py-3 transition md:rounded-full md:px-5 ${scrolled ? 'shadow-2xl' : ''}`}>
            <a
              href="#inicio"
              className={`tap-gold flex items-center gap-3 rounded-full px-1 py-1 ${isActive('#inicio') ? 'brand-active' : ''}`}
              aria-label="Studio de Beleza Thallyta Silveira"
              aria-current={isActive('#inicio') ? 'page' : undefined}
            >
              <span className="silver-glow grid size-11 place-items-center rounded-full border border-gold/50 bg-black/20 font-display text-xl font-bold text-gold-light">TS</span>
              <span className="hidden font-display text-xl font-semibold text-cream sm:block">Thallyta Silveira</span>
            </a>

            <div className="hidden items-center gap-2 lg:flex">
              {links.map(([label, href]) => (
                <a key={href} href={href} className={`nav-link px-3 py-2 text-sm ${isActive(href) ? 'active' : ''}`} aria-current={isActive(href) ? 'page' : undefined}>
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
                <FiMenu />
              </button>
            </div>
          </div>
        </nav>
      </header>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm lg:hidden">
          <aside className="frosted-panel ml-auto h-full w-80 max-w-[86vw] p-6 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <span className="font-display text-2xl text-gold-light">TS</span>
              <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="tap-gold rounded-md p-2 text-cream">
                <FiX />
              </button>
            </div>
            <div className="grid gap-2">
              {links.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`nav-link rounded-md px-3 py-3 text-cream/80 ${isActive(href) ? 'active' : ''}`}
                  aria-current={isActive(href) ? 'page' : undefined}
                >
                  {label}
                </a>
              ))}
              {!user && (
                <button
                  onClick={() => {
                    setOpen(false)
                    setLoginOpen(true)
                  }}
                  className="gold-button mt-4 rounded-md px-4 py-3 font-bold"
                >
                  Entrar
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gold/25 bg-cream/78 px-3 py-2 text-dark shadow-2xl backdrop-blur-2xl md:hidden" aria-label="Navegação principal mobile">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {mobileLinks.map(([label, href, Icon]) => (
            <a
              key={href}
              href={href}
              className={`mobile-nav-link tap-gold flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[0.66rem] font-bold uppercase tracking-tight hover:bg-gold/30 ${isActive(href) ? 'active' : ''}`}
              aria-current={isActive(href) ? 'page' : undefined}
            >
              <Icon className="text-lg" />
              {label}
            </a>
          ))}
        </div>
      </nav>
      <LoginModal />
    </>
  )
}
