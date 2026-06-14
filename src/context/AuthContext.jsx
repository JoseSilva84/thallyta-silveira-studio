import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { isGoogleOAuthRiskBrowser } from '../utils/browser.js'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const readToken = () => localStorage.getItem('authToken')
const parseToken = (token) => {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('authToken')
      return null
    }
    return payload
  } catch {
    return null
  }
}

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
    if (payload?.name) payload.name = decodeUtf8(payload.name)
    return payload
  })
  const [loginOpen, setLoginOpen] = useState(false)
  const [googleBrowserWarningOpen, setGoogleBrowserWarningOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchMe = useCallback(async (token = readToken()) => {
    if (!token) return null

    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Sessao expirada.')
      const data = await res.json()
      setUser(data)
      return data
    } catch {
      localStorage.removeItem('authToken')
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (token) {
      localStorage.setItem('authToken', token)
      const payload = parseToken(token)
      if (payload?.name) payload.name = decodeUtf8(payload.name)
      setUser(payload)
      fetchMe(token)
      toast.success(`Bem-vinda, ${payload?.name || 'cliente'}!`)
      window.history.replaceState({}, '', '/')
      return
    }

    if (readToken()) {
      fetchMe()
    }
  }, [fetchMe])

  const register = useCallback(async ({ name, email, password, whatsappPhone }) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, whatsappPhone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar conta.')
      localStorage.setItem('authToken', data.token)
      setUser(data.user)
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
      toast.error('Email e senha sao obrigatorios.')
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
      if (!res.ok) throw new Error(data.error || 'Credenciais invalidas.')
      localStorage.setItem('authToken', data.token)
      setUser(data.user)
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

  const continueGoogleLogin = useCallback(() => {
    setGoogleBrowserWarningOpen(false)
    window.location.href = `${API}/auth/google`
  }, [])

  const loginWithGoogle = useCallback(() => {
    if (isGoogleOAuthRiskBrowser()) {
      setGoogleBrowserWarningOpen(true)
      return
    }
    continueGoogleLogin()
  }, [continueGoogleLogin])

  const openSiteInChrome = useCallback(() => {
    const path = `${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`
    window.location.href = `intent://${path}#Intent;scheme=${window.location.protocol.replace(':', '')};package=com.android.chrome;end`
  }, [])

  const copySiteAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Endereço copiado. Abra o Chrome ou Safari e cole na barra de endereço.')
    } catch {
      toast.info('Use o menu do navegador e escolha “Abrir no Chrome” ou “Abrir no Safari”.')
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('authToken')
    setUser(null)
    toast.info('Voce saiu da sua conta.')
  }, [])

  const getToken = useCallback(() => readToken(), [])

  const updateWhatsapp = useCallback(async (whatsappPhone) => {
    const token = readToken()
    if (!token) {
      toast.error('Entre na sua conta para salvar o WhatsApp.')
      return { ok: false }
    }

    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/me/whatsapp`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ whatsappPhone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar WhatsApp.')
      setUser(data)
      toast.success('WhatsApp salvo com sucesso!')
      return { ok: true }
    } catch (error) {
      toast.error(error.message)
      return { ok: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const isAdmin = user?.role === 'ADMIN'

  const value = useMemo(
    () => ({
      user,
      isAdmin,
      loading,
      login,
      logout,
      register,
      loginWithGoogle,
      loginOpen,
      setLoginOpen,
      googleBrowserWarningOpen,
      setGoogleBrowserWarningOpen,
      continueGoogleLogin,
      openSiteInChrome,
      copySiteAddress,
      getToken,
      fetchMe,
      updateWhatsapp,
    }),
    [
      user,
      isAdmin,
      loading,
      login,
      logout,
      register,
      loginWithGoogle,
      loginOpen,
      googleBrowserWarningOpen,
      continueGoogleLogin,
      openSiteInChrome,
      copySiteAddress,
      getToken,
      fetchMe,
      updateWhatsapp,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
