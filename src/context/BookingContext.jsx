import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from './AuthContext.jsx'

const BookingContext = createContext(null)

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export function BookingProvider({ children }) {
  const { user, getToken } = useAuth()
  const [selectedServices, setSelectedServices] = useState([])
  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [scheduleRequestId, setScheduleRequestId] = useState(0)
  const [isBookingDetailsStep, setIsBookingDetailsStep] = useState(false)
  const [isScheduleStepOpen, setIsScheduleStepOpen] = useState(false)
  const [paymentType, setPaymentType] = useState('deposit')
  const [isPaymentUnlocked, setIsPaymentUnlocked] = useState(false)

  const toggleService = useCallback((service) => {
    setSelectedServices((current) => (current.some((item) => item.id === service.id) ? [] : [service]))
  }, [])

  const addService = useCallback((service) => {
    setSelectedServices((current) => {
      if (current.some((item) => item.id === service.id)) return current
      return [service]
    })
  }, [])

  const clearServices = useCallback(() => {
    setSelectedServices([])
    setIsPaymentUnlocked(false)
    setIsScheduleStepOpen(false)
    setPaymentType('deposit')
  }, [])
  const requestSchedule = useCallback(() => setScheduleRequestId((current) => current + 1), [])

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

  const cancelBooking = useCallback(async (bookingId) => {
    const token = getToken()
    if (!token) {
      toast.info('Entre na sua conta para cancelar o agendamento.')
      return { ok: false }
    }

    try {
      const res = await fetch(`${API}/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao cancelar agendamento.')

      setBookings((current) => current.map((booking) => (booking.id === data.id ? data : booking)))
      toast.success('Agendamento cancelado.')
      return { ok: true, booking: data }
    } catch (error) {
      toast.error(error.message)
      return { ok: false, error: error.message }
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
      requestSchedule,
      scheduleRequestId,
      isBookingDetailsStep,
      setIsBookingDetailsStep,
      isScheduleStepOpen,
      setIsScheduleStepOpen,
      paymentType,
      setPaymentType,
      isPaymentUnlocked,
      setIsPaymentUnlocked,
      fetchBookings,
      cancelBooking,
    }),
    [
      selectedServices,
      bookings,
      loadingBookings,
      addService,
      toggleService,
      clearServices,
      requestSchedule,
      scheduleRequestId,
      isBookingDetailsStep,
      isScheduleStepOpen,
      paymentType,
      isPaymentUnlocked,
      fetchBookings,
      cancelBooking,
    ],
  )

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export const useBooking = () => useContext(BookingContext)
