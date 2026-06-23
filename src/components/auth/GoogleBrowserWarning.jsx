import { FiCopy, FiExternalLink, FiX } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext.jsx'
import { isAndroidBrowser } from '../../utils/browser.js'

export default function GoogleBrowserWarning() {
  const {
    googleBrowserWarningOpen,
    setGoogleBrowserWarningOpen,
    continueGoogleLogin,
    openSiteInChrome,
    copySiteAddress,
  } = useAuth()

  if (!googleBrowserWarningOpen) return null

  const isAndroid = isAndroidBrowser()

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="gold-border relative w-full max-w-md rounded-3xl bg-dark-card p-6 shadow-2xl">
        <button
          type="button"
          aria-label="Fechar aviso"
          onClick={() => setGoogleBrowserWarningOpen(false)}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-cream/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <FiX size={20} />
        </button>

        <p className="pr-10 text-xs font-bold uppercase tracking-[0.25em] text-gold-light">Login com Google</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-cream">Abra em um navegador seguro</h2>
        <p className="mt-3 text-sm leading-6 text-cream/70">
          O Google pode bloquear o login quando o site está aberto pelo Instagram, Facebook, WhatsApp ou navegador Samsung.
          Abra o site diretamente no Chrome ou Safari e toque novamente em “Entrar com Google”.
        </p>

        <p className="mt-2 text-sm leading-6 text-cream/70">
          Se voce esta no navegador do Instagram ou em um navegador interno/secundario, use o botao abaixo para abrir no Google Chrome.
        </p>

        <div className="mt-6 space-y-3">
          {isAndroid && (
            <button
              type="button"
              onClick={openSiteInChrome}
              className="gold-button flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
            >
              <FiExternalLink /> Abrir no Chrome
            </button>
          )}
          <button
            type="button"
            onClick={copySiteAddress}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/25 px-5 py-3 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/10"
          >
            <FiCopy /> Copiar endereço do site
          </button>
          <button
            type="button"
            onClick={continueGoogleLogin}
            className="w-full px-5 py-2 text-sm text-cream/55 transition-colors hover:text-cream"
          >
            Tentar login mesmo assim
          </button>
        </div>
      </div>
    </div>
  )
}
