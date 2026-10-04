const money = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
})
export const formatMoney = (n: number) => money.format(n)

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
