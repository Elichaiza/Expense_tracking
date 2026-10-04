import type { ReactNode } from 'react'
import { formatMoney, monthKey, monthLabel, todayIso } from '../lib/format'
import { addMonths } from '../lib/analytics'
import { EXPENSE_COLOR, INCOME_COLOR } from '../lib/colors'
import { IconArrowDown, IconArrowUp, IconChevronLeft, IconChevronRight } from './Icons'

/** בורר חודש. החץ הימני הוא "חודש קודם" (כיוון הקריאה בעברית) */
export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const current = monthKey(todayIso())
  const canNext = month < current
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur px-1 py-1 text-white">
      <button
        aria-label="חודש קודם"
        className="w-8 h-8 grid place-items-center rounded-full active:bg-white/20"
        onClick={() => onChange(addMonths(month, -1))}
      >
        <IconChevronRight className="w-5 h-5" />
      </button>
      <span className="min-w-[8.5rem] text-center text-sm font-semibold">{monthLabel(month)}</span>
      <button
        aria-label="חודש הבא"
        disabled={!canNext}
        className="w-8 h-8 grid place-items-center rounded-full active:bg-white/20 disabled:opacity-30"
        onClick={() => onChange(addMonths(month, 1))}
      >
        <IconChevronLeft className="w-5 h-5" />
      </button>
    </div>
  )
}

/**
 * שינוי באחוזים מול תקופה קודמת. הצבע תלוי בכיוון ובשאלה אם עלייה טובה,
 * ותמיד מלווה בחץ ובטקסט, כך שהצבע לא נושא את המשמעות לבדו.
 */
export function Delta({
  value,
  upIsGood,
  suffix = 'מחודש קודם',
}: {
  value: number | null
  upIsGood: boolean
  suffix?: string
}) {
  if (value === null) return <span className="text-xs text-slate-400">אין השוואה</span>
  const rounded = Math.round(Math.abs(value))
  if (rounded === 0) return <span className="text-xs text-slate-500">ללא שינוי {suffix}</span>
  const up = value > 0
  const good = up === upIsGood
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        good ? 'text-emerald-700' : 'text-rose-600'
      }`}
    >
      {up ? <IconArrowUp className="w-3.5 h-3.5" /> : <IconArrowDown className="w-3.5 h-3.5" />}
      {rounded}%<span className="font-normal text-slate-400">{suffix}</span>
    </span>
  )
}

export function StatTile({
  label,
  value,
  mark,
  small,
  children,
}: {
  label: string
  value: string
  mark?: string
  small?: boolean
  children?: ReactNode
}) {
  return (
    <div className="card p-4 min-w-0">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {mark && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: mark }} />}
        {label}
      </div>
      <div className={`${small ? 'text-lg' : 'text-2xl'} font-bold mt-1 tracking-tight truncate`}>{value}</div>
      {children && <div className="mt-1">{children}</div>}
    </div>
  )
}

export function Section({
  title,
  hint,
  right,
  children,
}: {
  title: string
  hint?: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="font-bold text-lg leading-tight">{title}</h2>
          {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div
      className="grid p-1 rounded-2xl bg-slate-200/70 text-sm font-semibold"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`py-2 rounded-xl transition ${
            value === o.value ? 'bg-white text-slate-900 shadow' : 'text-slate-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const kindColor = (kind: 'income' | 'expense') => (kind === 'income' ? INCOME_COLOR : EXPENSE_COLOR)

export { formatMoney }
