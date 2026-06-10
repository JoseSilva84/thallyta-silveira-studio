export const onlyDigits = (value) => String(value || '').replace(/\D/g, '')

export const formatBrazilWhatsappInput = (value) => {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export const normalizeBrazilWhatsapp = (value) => {
  const digits = onlyDigits(value)
  if (!digits) return ''
  return digits.startsWith('55') ? digits : `55${digits}`
}
