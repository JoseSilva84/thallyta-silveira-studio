import { BsInstagram, BsWhatsapp } from 'react-icons/bs'
import { Link } from 'react-router-dom'
import { FiLock } from 'react-icons/fi'

export default function Footer() {
  return (
    <footer className="border-t border-gold/15 bg-black/30 py-10 pb-28 backdrop-blur md:pb-10">
      <div className="section-shell grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="mb-3 font-display text-3xl font-semibold text-gold-light">TS</div>
          <p className="text-sm text-cream/70">Realçando sua beleza com excelência!</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-cream/65">
          {['Início', 'Sobre', 'Serviços', 'Galeria', 'Agendamento', 'Localização'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`} className="tap-gold rounded px-2 py-1 hover:text-gold-light">
              {item}
            </a>
          ))}
        </div>
        <div className="flex items-start gap-3 md:justify-end">
          <a href="https://instagram.com/studiodebelezathallytasilveira" target="_blank" rel="noreferrer" className="tap-gold rounded-full border border-gold/30 p-3 text-gold-light">
            <BsInstagram />
          </a>
          <a href="https://wa.me/5588981860582" target="_blank" rel="noreferrer" className="tap-gold rounded-full border border-gold/30 p-3 text-gold-light">
            <BsWhatsapp />
          </a>
          <Link to="/admin" className="tap-gold ml-2 rounded-full border border-white/10 p-3 text-cream/40 transition-colors hover:text-gold-light" aria-label="Painel Administrativo" title="Painel Administrativo">
            <FiLock />
          </Link>
        </div>
      </div>
      <div className="section-shell mt-8 flex items-center justify-center md:justify-start">
        <p className="text-xs text-cream/45 text-center md:text-left">© 2026 Studio de Beleza Thallyta Silveira. Todos os direitos reservados.</p>
      </div>
    </footer>
  )
}
