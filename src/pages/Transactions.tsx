import { supabase } from '../lib/supabase'
import { formatDate, formatMoney, monthKey, monthLabel, todayIso } from '../lib/format'
import { saveRule } from '../lib/classify'
import type { Category, Expense, Kind } from '../lib/types'

const TEXT = {
  expense: { empty: 'אין עדיין הוצאות. לחץ על + כדי להוסיף.', del: 'למחוק את ההוצאה?', recurring: '🔁 קבועה' },
  income: { empty: 'אין עדיין הכנסות. לחץ על + כדי להוסיף.', del: 'למחוק את ההכנסה?', recurring: '🔁 קבועה' },
} as const

type Props = {
  kind: Kind
  householdId: string
  items: Expense[] // רק הפריטים מהסוג הזה
  categories: Category[] // רק הקטגוריות מהסוג הזה
  members: Record<string, string>
  onChanged: () => void
}

export default function Transactions({ kind, householdId, items, categories, members, onChanged }: Props) {
  const t = TEXT[kind]
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))
  const thisMonth = monthKey(todayIso())
  const monthTotal = items.filter((x) => monthKey(x.spent_at) === thisMonth).reduce((s, x) => s + x.amount, 0)

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

  return (
    <div>
      <div className="flex items-center justify-between bg-slate-800/60 rounded-2xl px-4 py-3 mb-3">
        <span className="text-sm text-slate-400">סה״כ {monthLabel(thisMonth)}</span>
        <span className={`font-bold text-lg ${kind === 'income' ? 'text-emerald-400' : ''}`}>
          {kind === 'income' && monthTotal > 0 ? '+' : ''}
          {formatMoney(monthTotal)}
        </span>
      </div>

      {!items.length ? (
        <p className="text-center text-slate-400 mt-12">{t.empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((x) => {
            const cat = x.category_id ? catById[x.category_id] : undefined
            return (
              <li key={x.id} className="flex items-center gap-3 bg-slate-800/60 rounded-2xl p-3">
                <div className="relative text-2xl w-10 text-center">
                  {cat?.icon ?? '❔'}
                  <select
                    className="absolute inset-0 w-full h-full opacity-0"
                    aria-label="שינוי קטגוריה"
                    value={x.category_id ?? ''}
                    onChange={(e) => changeCategory(x, e.target.value)}
                  >
                    <option value="">ללא קטגוריה</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{x.title}</div>
                  <div className="text-xs text-slate-400">
                    {cat?.name ?? 'ללא קטגוריה'} · {formatDate(x.spent_at)}
                    {x.recurring_id ? ` · ${t.recurring}` : ''}
                    {members[x.user_id] ? ` · ${members[x.user_id]}` : ''}
                  </div>
                </div>
                <div className={`font-semibold ${kind === 'income' ? 'text-emerald-400' : ''}`}>
                  {kind === 'income' ? '+' : ''}
                  {formatMoney(x.amount)}
                </div>
                <button
                  className="text-slate-500 px-1"
                  aria-label="מחיקה"
                  onClick={() => remove(x.id)}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
