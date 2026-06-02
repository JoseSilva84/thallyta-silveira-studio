import { useForm } from 'react-hook-form'
import { FiX } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../../context/AuthContext.jsx'

export default function LoginModal() {
  const { loginOpen, setLoginOpen, login } = useAuth()
  const { register, handleSubmit } = useForm({ defaultValues: { email: '', password: '' } })

  if (!loginOpen) return null

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="gold-border relative w-full max-w-md rounded-lg bg-dark-card/85 p-6 pt-6 shadow-2xl">
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
            <input
              className="mt-2 w-full rounded-md border border-dark-border bg-black/35 px-4 py-3 text-cream"
              type="password"
              placeholder="••••••••"
              {...register('password')}
            />
          </label>
          <button type="submit" className="gold-button w-full rounded-md px-5 py-3 text-sm font-bold">
            Entrar
          </button>
        </form>
        <button
          type="button"
          onClick={() => login({ name: 'Cliente Google', email: 'google@cliente.com' })}
          className="tap-gold mt-3 flex w-full items-center justify-center gap-3 rounded-md border border-dark-border bg-white px-5 py-3 text-sm font-bold text-zinc-900"
        >
          <FcGoogle />
          Entrar com Google
        </button>
        <button type="button" onClick={() => login({ name: 'Nova Cliente', email: 'cliente@studio.com' })} className="tap-gold mt-4 rounded px-2 py-1 text-sm text-gold-light">
          Criar conta
        </button>
      </div>
    </div>
  )
}
