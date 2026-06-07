import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'

const BookingContext = createContext(null)

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export function BookingProvider({ children }) {
  const { user, getToken } = useAuth()
  const [selectedServices, setSelectedServices] = useState([])
  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(false)

  const toggleService = (service) => {
    setSelectedServices((current) =>
      current.some((item) => item.id === service.id)
        ? current.filter((item) => item.id !== service.id)
        : [...current, service],
    )
  }

  const addService = (service) => {
    setSelectedServices((current) => {
      if (current.some((item) => item.id === service.id)) return current
      return [...current, service]
    })
  }

  const clearServices = () => setSelectedServices([])

  // Busca os agendamentos do usuário logado (ou todos, se admin) a partir da API
  const fetchBookings = useCallback(async (token) => {
    const t = token || getToken()
    if (!t) return
    setLoadingBookings(true)
    try {
      const res = await fetch(`${API}/bookings`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) {
        const data = await res.json()
        setBookings(data)
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error)
    } finally {
      setLoadingBookings(false)
    }
  }, [getToken])

  // Busca automaticamente os bookings quando o usuário loga
  useEffect(() => {
    if (user) {
      fetchBookings()
    } else {
      setBookings([])
    }
  }, [user, fetchBookings])

  const value = useMemo(
    () => ({
      selectedServices,
      bookings,
      loadingBookings,
      addService,
      toggleService,
      clearServices,
      fetchBookings,
    }),
    [selectedServices, bookings, loadingBookings, fetchBookings],
  )

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export const useBooking = () => useContext(BookingContext)
