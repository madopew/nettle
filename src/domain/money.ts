export const NBSP = ' '

const MINUS = '−'

export function formatGrouped(amount: number): string {
  const sign = amount < 0 ? MINUS : ''
  const digits = Math.abs(Math.trunc(amount)).toString()
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return sign + grouped
}

export function formatTenge(amount: number): string {
  return `${formatGrouped(amount)}${NBSP}₸`
}

export function formatSignedTenge(amount: number): string {
  if (amount === 0) return `0${NBSP}₸`
  const prefix = amount > 0 ? '+' : MINUS
  return `${prefix}${formatGrouped(Math.abs(amount))}${NBSP}₸`
}

export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[\s ]/g, '')
  if (cleaned === '') return null
  if (!/^\d+$/.test(cleaned)) return null
  const value = Number(cleaned)
  if (!Number.isSafeInteger(value) || value <= 0) return null
  return value
}
