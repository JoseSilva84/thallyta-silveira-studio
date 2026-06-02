import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'

const AuthContext = createContext(null)

const API = 'http://localhost:3001/api'

const readToken = () => localStorage.getItem('authToken')
const parseToken = (token) => {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // Verifica se o token ainda é válido
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('authToken')
      return null
    }
    return payload
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => parseToken(readToken()))
  const [loginOpen, setLoginOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Ao montar, verifica se o token da URL é do Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token && window.location.pathname === '/auth/callback') {
      localStorage.setItem('authToken', token)
      const payload = parseToken(token)
      setUser(payload)
      toast.success(`Bem-vinda, ${payload?.name || 'cliente'}!`)
      // Limpa a URL
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const register = useCallback(async ({ name, email, password }) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar conta.')
      localStorage.setItem('authToken', data.token)
      setUser(parseToken(data.token))
      setLoginOpen(false)
      toast.success(`Conta criada! Bem-vinda, ${data.user.name}!`)
      return { ok: true }
    } catch (error) {
      toast.error(error.message)
      return { ok: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async ({ email, password }) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Credenciais inválidas.')
      localStorage.setItem('authToken', data.token)
      setUser(parseToken(data.token))
      setLoginOpen(false)
      toast.success(`Bem-vinda, ${data.user.name}!`)
      return { ok: true }
    } catch (error) {
      toast.error(error.message)
      return { ok: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const loginWithGoogle = useCallback(() => {
    window.location.href = `${API}/auth/google`
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('authToken')
    setUser(null)
    toast.info('Você saiu da sua conta.')
  }, [])

  const getToken = useCallback(() => readToken(), [])

  const isAdmin = user?.role === 'ADMIN'

  const value = useMemo(
    () => ({ user, isAdmin, loading, login, logout, register, loginWithGoogle, loginOpen, setLoginOpen, getToken }),
    [user, isAdmin, loading, login, logout, register, loginWithGoogle, loginOpen, getToken]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
