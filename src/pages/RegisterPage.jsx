import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiPhone } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../context/AuthContext'
import { formatBrazilWhatsappInput, normalizeBrazilWhatsapp, onlyDigits } from '../utils/phone'

export default function RegisterPage() {
  const { register, loginWithGoogle, loading } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', whatsappPhone: '', password: '', confirm: '' })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({
      ...f,
      [name]: name === 'whatsappPhone' ? formatBrazilWhatsappInput(value) : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (onlyDigits(form.whatsappPhone).length < 10) {
      setError('Informe um WhatsApp válido com DDD.')
      return
    }

    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password,
      whatsappPhone: normalizeBrazilWhatsapp(form.whatsappPhone),
    })
    if (result.ok) navigate('/')
    else setError(result.error)
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-5xl font-bold text-gold-light">TS</Link>
          <p className="text-cream/50 mt-2 text-sm">Studio de Beleza Thallyta Silveira</p>
        </div>

        <div className="gold-border rounded-3xl bg-black/60 p-8 backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-cream mb-1">Criar conta</h1>
          <p className="text-cream/50 text-sm mb-6">Cadastre-se para agendar seus horários</p>

          {/* Google */}
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-cream transition-all hover:bg-white/10 hover:border-white/20 mb-4"
          >
            <FcGoogle size={20} />
            Cadastrar com Google
          </button>
          <p className="-mt-2 mb-4 text-center text-xs leading-5 text-cream/40">
            Se abriu o site por outro aplicativo, use o Chrome ou Safari para entrar com Google.
          </p>

          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-cream/30 text-xs">ou</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nome */}
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50" />
              <input
                type="text"
                name="name"
                placeholder="Seu nome completo"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-cream placeholder-cream/30 outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition"
              />
            </div>

            {/* Email */}
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

            {/* WhatsApp */}
            <div className="relative">
              <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50" />
              <input
                type="tel"
                name="whatsappPhone"
                placeholder="WhatsApp com DDD"
                value={form.whatsappPhone}
                onChange={handleChange}
                inputMode="numeric"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-cream placeholder-cream/30 outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition"
              />
            </div>

            {/* Senha */}
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50" />
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                placeholder="Senha (mín. 6 caracteres)"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm text-cream placeholder-cream/30 outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition"
              />
              <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-cream/30 hover:text-cream">
                {showPass ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {/* Confirmar Senha */}
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50" />
              <input
                type={showPass ? 'text' : 'password'}
                name="confirm"
                placeholder="Confirmar senha"
                value={form.confirm}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-cream placeholder-cream/30 outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition"
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-gold to-gold-light py-3 font-bold text-dark transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(217,177,92,0.4)] disabled:opacity-50"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-cream/40 text-sm mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-gold hover:text-gold-light font-semibold">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
