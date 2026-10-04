import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dayLabel, formatMoney, formatMoneySigned, monthLabel, todayIso } from '../lib/format'
import { saveRule } from '../lib/classify'
import { daysInMonth, monthOf } from '../lib/analytics'
import type { Category, Expense, Kind } from '../lib/types'
import { IconClose, IconSearch } from '../components/Icons'

type Props = {
  kind: Kind
  householdId: string
  items: Expense[] // רק הפריטים מהסוג הזה (כל החודשים)
  categories: Category[] // רק הקטגוריות מהסוג הזה
  members: Record<string, string>
  month: string
  onChanged: () => void
}

const TEXT = {
  expense: { total: 'סה״כ הוצאות', empty: 'אין הוצאות בחודש הזה', del: 'למחוק את ההוצאה?' },
  income: { total: 'סה״כ הכנסות', empty: 'אין הכנסות בחודש הזה', del: 'למחוק את ההכנסה?' },
} as const

export default function Transactions({ kind, householdId, items, categories, members, month, onChanged }: Props) {
  const t = TEXT[kind]
  const today = todayIso()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))

  const monthItems = useMemo(() => items.filter((x) => monthOf(x.spent_at) === month), [items, month])
  const total = monthItems.reduce((s, x) => s + x.amount, 0)
  const elapsed = monthOf(today) === month ? Number(today.slice(8, 10)) : daysInMonth(month)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return monthItems.filter(
      (x) => (!cat || x.category_id === cat) && (!q || x.title.toLowerCase().includes(q)),
    )
  }, [monthItems, query, cat])

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const x of shown) map.set(x.spent_at, [...(map.get(x.spent_at) ?? []), x])
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [shown])

  // תיקון קטגוריה: מעדכן את הפריט ולומד את הכלל למקור הזה
  async function changeCategory(x: Expense, categoryId: string) {
    await supabase
      .from('expenses')
      .update({ category_id: categoryId || null })
      .eq('id', x.id)
    if (categoryId) await saveRule(householdId, x.merchant ?? x.title, categoryId)
    onChanged()
  }

  async function remove(id: string) {
    if (!confirm(t.del)) return
    await supabase.from('expenses').delete().eq('id', id)
    onChanged()
  }

  const income = kind === 'income'

  return (
    <div className="space-y-4 -mt-3">
      <div className="card p-5">
        <div className="text-sm text-slate-500">
          {t.total} · {monthLabel(month)}
        </div>
        <div className={`text-4xl font-extrabold tracking-tight mt-1 ${income ? 'text-emerald-700' : ''}`}>
          {income ? formatMoneySigned(total) : formatMoney(total)}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-slate-500">
          <span>{monthItems.length} פעולות</span>
          {monthItems.length > 0 && <span>ממוצע ליום {formatMoney(total / Math.max(elapsed, 1))}</span>}
        </div>
      </div>

      {/* חיפוש וסינון */}
      <div className="relative">
        <IconSearch className="w-5 h-5 absolute top-1/2 -translate-y-1/2 start-4 text-slate-400 pointer-events-none" />
        <input
          className="field !ps-12"
          placeholder="חיפוש לפי כותרת…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        <button
          onClick={() => setCat(null)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
            cat === null ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
          }`}
        >
          הכל
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(cat === c.id ? null : c.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              cat === c.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <div className="text-4xl mb-2">{income ? '💰' : '🧾'}</div>
          {monthItems.length === 0 ? t.empty : 'לא נמצאו תוצאות'}
          {monthItems.length === 0 && <div className="text-xs mt-1">לחצו על + כדי להוסיף</div>}
        </div>
      ) : (
        groups.map(([date, list]) => (
          <div key={date}>
            <div className="flex items-center justify-between px-1 mb-2 text-xs text-slate-500">
              <span className="font-semibold">{dayLabel(date, today)}</span>
              <span>{formatMoney(list.reduce((s, x) => s + x.amount, 0))}</span>
            </div>
            <ul className="card divide-y divide-slate-100">
              {list.map((x) => {
                const c = x.category_id ? catById[x.category_id] : undefined
                return (
                  <li key={x.id} className="flex items-center gap-3 p-3">
                    <div className="relative w-11 h-11 rounded-2xl bg-slate-100 grid place-items-center text-2xl shrink-0">
                      {c?.icon ?? '❔'}
                      <select
                        className="absolute inset-0 w-full h-full opacity-0"
                        aria-label="שינוי קטגוריה"
                        value={x.category_id ?? ''}
                        onChange={(e) => changeCategory(x, e.target.value)}
                      >
                        <option value="">ללא קטגוריה</option>
                        {categories.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.icon} {k.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{x.title}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {c?.name ?? 'ללא קטגוריה'}
                        {x.recurring_id ? ' · 🔁 קבועה' : ''}
                        {members[x.user_id] ? ` · ${members[x.user_id]}` : ''}
                      </div>
                    </div>
                    <div className="font-semibold" style={income ? { color: '#047857' } : undefined}>
                      {income ? formatMoneySigned(x.amount) : formatMoney(x.amount)}
                    </div>
                    <button
                      className="text-slate-300 active:text-rose-500 p-1"
                      aria-label="מחיקה"
                      onClick={() => remove(x.id)}
                    >
                      <IconClose className="w-4 h-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
