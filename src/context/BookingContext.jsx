import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const BookingContext = createContext(null)

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export function BookingProvider({ children }) {
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
    if (!token) return
    setLoadingBookings(true)
    try {
      const res = await fetch(`${API}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
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
  }, [])

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
