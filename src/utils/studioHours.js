const STUDIO_TIME_ZONE = 'America/Fortaleza'

export const getStudioOpenStatus = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const value = (type) => parts.find((part) => part.type === type)?.value
  const weekday = value('weekday')
  const hour = Number(value('hour'))
  const minute = Number(value('minute'))
  const minutesNow = hour * 60 + minute
  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday)
  const opensAt = 9 * 60 + 30
  const lunchStartsAt = 13 * 60
  const lunchEndsAt = 14 * 60 + 30
  const closesAt = 18 * 60
  const isLunchBreak = minutesNow >= lunchStartsAt && minutesNow < lunchEndsAt
  const isOpen = isWeekday && minutesNow >= opensAt && minutesNow < closesAt && !isLunchBreak

  return {
    isOpen,
    label: isOpen ? 'Atendimento aberto' : 'Atendimento fechado',
    shortLabel: isOpen ? 'Aberto agora' : 'Fechado agora',
    detail: 'Segunda a sexta, 09:30 as 18:00, pausa 13:00 as 14:30',
  }
}
