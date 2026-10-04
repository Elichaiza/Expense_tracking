import { supabase } from '../lib/supabase'
import { formatDate, formatMoney } from '../lib/format'
import { saveRule } from '../lib/classify'
import type { Category, Expense } from '../lib/types'

type Props = {
  householdId: string
  expenses: Expense[]
  categories: Category[]
  members: Record<string, string>
  onChanged: () => void
}

export default function Expenses({ householdId, expenses, categories, members, onChanged }: Props) {
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))

  // תיקון קטגוריה: מעדכן את ההוצאה ולומד את הכלל לחנות הזו
  async function changeCategory(x: Expense, categoryId: string) {
    await supabase
      .from('expenses')
      .update({ category_id: categoryId || null })
      .eq('id', x.id)
    if (categoryId) await saveRule(householdId, x.merchant ?? x.title, categoryId)
    onChanged()
  }

  async function remove(id: string) {
    if (!confirm('למחוק את ההוצאה?')) return
    await supabase.from('expenses').delete().eq('id', id)
    onChanged()
  }

  if (!expenses.length)
    return <p className="text-center text-slate-400 mt-16">אין עדיין הוצאות. לחץ על + כדי להוסיף.</p>

  return (
    <ul className="space-y-2">
      {expenses.map((x) => {
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
                {x.recurring_id ? ' · 🔁 קבועה' : ''}
                {members[x.user_id] ? ` · ${members[x.user_id]}` : ''}
              </div>
            </div>
            <div className="font-semibold">{formatMoney(x.amount)}</div>
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
  )
}
