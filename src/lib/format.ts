const money = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
})
export const formatMoney = (n: number) => money.format(n)

// עם סימן +/- שמוצג נכון גם בכיוון ימין-לשמאל
const signed = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
  signDisplay: 'exceptZero',
})
export const formatMoneySigned = (n: number) => signed.format(n)

export const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })

export const todayIso = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const monthKey = (iso: string) => iso.slice(0, 7)

export const monthLabel = (key: string) =>
  new Date(key + '-01T00:00:00').toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })

export const formatCompact = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1_000_000) return (Math.round(n / 100_000) / 10).toLocaleString('en-US') + 'M'
  if (a >= 1000) return (Math.round(n / 100) / 10).toLocaleString('en-US') + 'K'
  return String(Math.round(n))
}

export const shortMonth = (key: string) =>
  new Date(key + '-01T00:00:00').toLocaleDateString('he-IL', { month: 'short' })

/** "היום" / "אתמול" / "יום ג׳, 2 באוק׳" */
export function dayLabel(iso: string, today: string) {
  const y = new Date(today + 'T00:00:00')
  y.setDate(y.getDate() - 1)
  const p = (n: number) => String(n).padStart(2, '0')
  const yesterday = `${y.getFullYear()}-${p(y.getMonth() + 1)}-${p(y.getDate())}`
  if (iso === today) return 'היום'
  if (iso === yesterday) return 'אתמול'
  return new Date(iso + 'T00:00:00').toLocaleDateString('he-IL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
