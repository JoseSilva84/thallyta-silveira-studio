import { createContext, useContext, useMemo, useState } from 'react'
import { toast } from 'react-toastify'

const BookingContext = createContext(null)

const readBookings = () => {
  try {
    return JSON.parse(localStorage.getItem('bookings')) || []
  } catch {
    return []
  }
}

export function BookingProvider({ children }) {
  const [selectedServices, setSelectedServices] = useState([])
  const [bookings, setBookings] = useState(readBookings)

  const addService = (service) => {
    setSelectedServices((current) => {
      if (current.some((item) => item.id === service.id)) return current
      return [...current, service]
    })
    toast.success('✓ Serviço adicionado ao seu agendamento!')
  }

  const toggleService = (service) => {
    setSelectedServices((current) =>
      current.some((item) => item.id === service.id)
        ? current.filter((item) => item.id !== service.id)
        : [...current, service],
    )
  }

  const confirmBooking = (booking) => {
    const nextBookings = [{ id: crypto.randomUUID(), ...booking }, ...bookings]
    localStorage.setItem('bookings', JSON.stringify(nextBookings))
    localStorage.setItem('loyaltyStamps', String(Math.min(10, Number(localStorage.getItem('loyaltyStamps') || 4) + 1)))
    setBookings(nextBookings)
    setSelectedServices([])
  }

  const value = useMemo(
    () => ({ selectedServices, bookings, addService, toggleService, confirmBooking }),
    [selectedServices, bookings],
  )

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export const useBooking = () => useContext(BookingContext)
