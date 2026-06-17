import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FiEye, FiEyeOff, FiX } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function LoginModal() {
  const { loginOpen, setLoginOpen, login, loginWithGoogle, loading } = useAuth()
  const { register, handleSubmit } = useForm({ defaultValues: { email: '', password: '' } })
  const [showPass, setShowPass] = useState(false)
  const navigate = useNavigate()

  if (!loginOpen) return null

  const handleGoToRegister = () => {
    setLoginOpen(false)
    navigate('/register')
  }

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={() => setLoginOpen(false)}
    >
      <div
        className="gold-border relative w-full max-w-md rounded-lg bg-dark-card/85 p-6 pt-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Fechar login"
          onClick={() => setLoginOpen(false)}
          className="tap-gold absolute right-4 top-4 mb-8 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-cream/70 hover:bg-white/20 hover:text-white transition-colors"
        >
          <FiX size={20} />
        </button>
        <p className="text-xs uppercase tracking-[0.3em] text-gold-light mt-2">Entrar</p>
        <h2 className="mt-2 font-display text-4xl font-semibold">Sua área de beleza</h2>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(login)}>
          <label className="block text-sm text-cream/80">
            Email
            <input
              className="mt-2 w-full rounded-md border border-dark-border bg-black/35 px-4 py-3 text-cream"
              type="email"
              placeholder="voce@email.com"
              {...register('email', { required: true })}
            />
          </label>
          <label className="block text-sm text-cream/80">
            Senha
            <span className="relative mt-2 block">
              <input
                className="w-full rounded-md border border-dark-border bg-black/35 px-4 py-3 pr-12 text-cream"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password', { required: true })}
              />
              <button
                type="button"
                aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPass}
                onClick={() => setShowPass((value) => !value)}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-cream/45 transition-colors hover:text-cream"
              >
                {showPass ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </span>
          </label>
          <button type="submit" disabled={loading} className="gold-button w-full rounded-md px-5 py-3 text-sm font-bold disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <button
          type="button"
          onClick={loginWithGoogle}
          className="tap-gold mt-3 flex w-full items-center justify-center gap-3 rounded-md border border-dark-border bg-white px-5 py-3 text-sm font-bold text-zinc-900 transition-colors hover:bg-gray-100"
        >
          <FcGoogle />
          Entrar com Google
        </button>
        <p className="mt-2 text-center text-xs leading-5 text-cream/45">
          Em aplicativos como Instagram e Facebook, abra o site no Chrome ou Safari.
        </p>
        <button
          type="button"
          onClick={handleGoToRegister}
          className="tap-gold mt-4 rounded px-2 py-1 text-sm text-gold-light hover:text-gold transition-colors"
        >
          Não tem conta? <span className="underline">Criar conta</span>
        </button>
      </div>
    </div>
  )
}
