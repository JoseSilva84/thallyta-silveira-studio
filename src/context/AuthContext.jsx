import { createContext, useContext, useMemo, useState } from 'react'
import { toast } from 'react-toastify'

const AuthContext = createContext(null)

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem('authUser'))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser)
  const [loginOpen, setLoginOpen] = useState(false)

  const login = (data) => {
    const nextUser = {
      name: data.name || data.email?.split('@')[0] || 'Cliente',
      email: data.email || 'cliente@studio.com',
    }
    localStorage.setItem('authUser', JSON.stringify(nextUser))
    setUser(nextUser)
    setLoginOpen(false)
    toast.success(`Bem-vinda, ${nextUser.name}!`)
  }

  const logout = () => {
    localStorage.removeItem('authUser')
    setUser(null)
    toast.info('Você saiu da sua conta.')
  }

  const value = useMemo(() => ({ user, login, logout, loginOpen, setLoginOpen }), [user, loginOpen])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
