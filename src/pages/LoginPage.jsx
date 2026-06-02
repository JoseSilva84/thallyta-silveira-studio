import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiArrowLeft, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, loginWithGoogle, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const googleError = searchParams.get('error')

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const result = await login({ email: form.email, password: form.password })
    if (result.ok) navigate('/')
    else setError(result.error)
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4 relative">
      <div className="w-full max-w-md">
        {/* Botão Voltar */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-cream/50 hover:text-gold mb-8 transition-colors">
          <FiArrowLeft /> Voltar para o site
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-5xl font-bold text-gold-light">TS</Link>
          <p className="text-cream/50 mt-2 text-sm">Studio de Beleza Thallyta Silveira</p>
        </div>

        <div className="gold-border rounded-3xl bg-black/60 p-8 backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-cream mb-1">Entrar</h1>
          <p className="text-cream/50 text-sm mb-6">Acesse sua conta para agendar horários</p>

          {googleError && (
            <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              Falha ao entrar com o Google. Tente novamente.
            </div>
          )}

          {/* Google */}
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-cream transition-all hover:bg-white/10 hover:border-white/20 mb-4"
          >
            <FcGoogle size={20} />
            Entrar com Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-cream/30 text-xs">ou</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50" />
              <input
                type="email"
                name="email"
                placeholder="Seu email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-cream placeholder-cream/30 outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition"
              />
            </div>

            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50" />
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                placeholder="Sua senha"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm text-cream placeholder-cream/30 outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition"
              />
              <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-cream/30 hover:text-cream">
                {showPass ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-gold to-gold-light py-3 font-bold text-dark transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(217,177,92,0.4)] disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-cream/40 text-sm mt-6">
            Não tem conta?{' '}
            <Link to="/register" className="text-gold hover:text-gold-light font-semibold">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
