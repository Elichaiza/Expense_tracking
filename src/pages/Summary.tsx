import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { formatMoney, monthKey, monthLabel, todayIso } from '../lib/format'
import type { Category, Expense, Kind } from '../lib/types'

const COLORS = [
  '#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#f472b6',
  '#2dd4bf', '#fb923c', '#a3e635', '#38bdf8', '#94a3b8',
]

function shiftMonth(key: string, delta: number) {
  const d = new Date(key + '-01T00:00:00')
  d.setMonth(d.getMonth() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Summary({
  items,
  categories,
}: {
  items: Expense[] // הוצאות והכנסות יחד
  categories: Category[]
}) {
  const [month, setMonth] = useState(monthKey(todayIso()))
  const [view, setView] = useState<Kind>('expense')

  const { income, expense, rows } = useMemo(() => {
    const inMonth = items.filter((e) => monthKey(e.spent_at) === month)
    const sum = (k: Kind) => inMonth.filter((e) => e.kind === k).reduce((s, e) => s + e.amount, 0)

    const sums = new Map<string, number>()
    for (const e of inMonth.filter((x) => x.kind === view))
      sums.set(e.category_id ?? '', (sums.get(e.category_id ?? '') ?? 0) + e.amount)
    const rows = [...sums.entries()]
      .map(([id, value]) => {
        const c = categories.find((x) => x.id === id)
        return { id, value, name: c?.name ?? 'ללא קטגוריה', icon: c?.icon ?? '❔' }
      })
      .sort((a, b) => b.value - a.value)
    return { income: sum('income'), expense: sum('expense'), rows }
  }, [items, categories, month, view])

  const balance = income - expense
  const viewTotal = view === 'income' ? income : expense

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button className="btn-ghost px-4 py-2" onClick={() => setMonth(shiftMonth(month, -1))}>
          ›
        </button>
        <div className="font-semibold">{monthLabel(month)}</div>
        <button className="btn-ghost px-4 py-2" onClick={() => setMonth(shiftMonth(month, 1))}>
          ‹
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5 text-center">
        <div className="bg-slate-800/60 rounded-2xl p-3">
          <div className="text-xs text-slate-400">הכנסות</div>
          <div className="font-bold text-emerald-400">{formatMoney(income)}</div>
        </div>
        <div className="bg-slate-800/60 rounded-2xl p-3">
          <div className="text-xs text-slate-400">הוצאות</div>
          <div className="font-bold text-rose-400">{formatMoney(expense)}</div>
        </div>
        <div className="bg-slate-800/60 rounded-2xl p-3">
          <div className="text-xs text-slate-400">יתרה</div>
          <div className={`font-bold ${balance < 0 ? 'text-rose-400' : 'text-emerald-400'}`} dir="ltr">
            {formatMoney(balance)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-800 text-sm font-semibold mb-3">
        {(
          [
            ['expense', 'פירוט הוצאות'],
            ['income', 'פירוט הכנסות'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={`py-2 rounded-xl transition ${view === k ? 'bg-slate-600 text-white' : 'text-slate-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length > 0 ? (
        <>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={rows} dataKey="value" innerRadius={55} outerRadius={90} stroke="none">
                  {rows.map((r, i) => (
                    <Cell key={r.id} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 bg-slate-800/60 rounded-2xl p-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="text-xl">{r.icon}</span>
                <span className="flex-1">{r.name}</span>
                <span className="text-slate-400 text-sm">{Math.round((r.value / viewTotal) * 100)}%</span>
                <span className="font-semibold w-20 text-start">{formatMoney(r.value)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-center text-slate-400 mt-10">
          {view === 'income' ? 'אין הכנסות בחודש הזה.' : 'אין הוצאות בחודש הזה.'}
        </p>
      )}
    </div>
  )
}
