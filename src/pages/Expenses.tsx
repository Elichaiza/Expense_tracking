import { supabase } from '../lib/supabase'
import { formatDate, formatMoney } from '../lib/format'
import type { Category, Expense } from '../lib/types'

type Props = {
  expenses: Expense[]
  categories: Category[]
  members: Record<string, string>
  onChanged: () => void
}

export default function Expenses({ expenses, categories, members, onChanged }: Props) {
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))

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
            <div className="text-2xl w-10 text-center">{cat?.icon ?? '❔'}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{x.title}</div>
              <div className="text-xs text-slate-400">
                {cat?.name ?? 'ללא קטגוריה'} · {formatDate(x.spent_at)}
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
