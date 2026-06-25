const STUDIO_TIME_ZONE = 'America/Fortaleza'

const getStudioOpenStatus = () => {
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
  console.log({ parts, weekday, hour, minute })
  
  const minutesNow = hour * 60 + minute
  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday)
  const opensAt = 8 * 60          // 08:00
  const closesAt = 19 * 60         // 19:00 (cobre o último horário de 18:30)
  const isOpen = isWeekday && minutesNow >= opensAt && minutesNow < closesAt

  return { isOpen }
}

console.log(getStudioOpenStatus())
