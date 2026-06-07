import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

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

// Decodifica caracteres UTF-8 que podem vir mal codificados do JWT
const decodeUtf8 = (str) => {
  if (!str) return str
  try {
    return decodeURIComponent(escape(str))
  } catch {
    return str
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const payload = parseToken(readToken())
    if (payload && payload.name) {
      payload.name = decodeUtf8(payload.name)
    }
    return payload
  })
  const [loginOpen, setLoginOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Ao montar, verifica se o token da URL é do Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('authToken', token)
      const payload = parseToken(token)
      if (payload && payload.name) {
        payload.name = decodeUtf8(payload.name)
      }
      setUser(payload)
      toast.success(`Bem-vinda, ${payload?.name || 'cliente'}!`)
      // Limpa a URL sem recarregar a página
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
      const payload = parseToken(data.token)
      if (payload && payload.name) payload.name = decodeUtf8(payload.name)
      setUser(payload)
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
    if (!email || !password) {
      toast.error('Email e senha são obrigatórios.')
      return { ok: false }
    }
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
      const payload = parseToken(data.token)
      if (payload && payload.name) payload.name = decodeUtf8(payload.name)
      setUser(payload)
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
