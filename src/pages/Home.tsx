import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  averages, change, insights, monthStats, paceSeries, projection, addMonths, type Insight,
} from '../lib/analytics'
import { formatCompact, formatDate, formatMoney, formatMoneySigned, monthLabel, todayIso } from '../lib/format'
import { AXIS, EXPENSE_COLOR, GRID, INCOME_COLOR, MUTED } from '../lib/colors'
import type { Category, Expense, Kind } from '../lib/types'
import { Delta, Legend, Section, StatTile } from '../components/ui'
import { IconExpense, IconIncome, IconPlus } from '../components/Icons'

type Props = {
  items: Expense[]
  categories: Category[]
  month: string
  onAdd: (kind: Kind) => void
  onSeeAll: (kind: Kind) => void
}

const TONE: Record<Insight['tone'], string> = {
  good: 'bg-emerald-50 ring-emerald-200',
  warn: 'bg-amber-50 ring-amber-200',
  info: 'bg-white ring-slate-900/5',
}

function PaceTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number | null; dataKey: string }[]; label?: number }) {
  if (!active || !payload?.length) return null
  const cur = payload.find((p) => p.dataKey === 'current')?.value
  const prev = payload.find((p) => p.dataKey === 'previous')?.value
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-900/10" dir="rtl">
      <div className="font-semibold mb-1">יום {label} בחודש</div>
      {cur != null && <div>החודש: {formatMoney(cur)}</div>}
      {prev != null && <div className="text-slate-500">חודש קודם: {formatMoney(prev)}</div>}
    </div>
  )
}

export default function Home({ items, categories, month, onAdd, onSeeAll }: Props) {
  const today = todayIso()
  const prevMonth = addMonths(month, -1)

  const d = useMemo(() => {
    const stats = monthStats(items, month)
    const prev = monthStats(items, prevMonth)
    return {
      stats,
      prev,
      proj: projection(items, month, today),
      avg: averages(items, month, 3),
      pace: paceSeries(items, month, 'expense', today),
      tips: insights(items, categories, month, today),
    }
  }, [items, categories, month, prevMonth, today])

  const { stats, prev, proj, avg } = d
  const ratio = stats.income > 0 ? (stats.expense / stats.income) * 100 : null
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))
  const recent = items.slice(0, 5)
  const empty = stats.expenseCount + stats.incomeCount === 0

  return (
    <div className="space-y-6 -mt-3">
      {/* כרטיס הגיבור: היתרה החודשית */}
      <div className="card p-5">
        <div className="text-sm text-slate-500">יתרה ב{monthLabel(month)}</div>
        <div
          className={`text-5xl font-extrabold tracking-tight mt-1 ${stats.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}
        >
          {formatMoney(stats.balance)}
        </div>

        <div className="mt-4">
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, ratio ?? 0)}%`,
                background: ratio !== null && ratio > 100 ? '#d03b3b' : EXPENSE_COLOR,
              }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {ratio === null
              ? stats.expense > 0
                ? 'עדיין לא נרשמו הכנסות החודש'
                : 'אין עדיין נתונים לחודש הזה'
              : ratio > 100
                ? `הוצאתם ${Math.round(ratio)}% מההכנסות: יותר ממה שהרווחתם`
                : `הוצאתם ${Math.round(ratio)}% מההכנסות החודש`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="הכנסות" value={formatMoney(stats.income)} mark={INCOME_COLOR}>
          <Delta value={change(stats.income, prev.income)} upIsGood />
        </StatTile>
        <StatTile label="הוצאות" value={formatMoney(stats.expense)} mark={EXPENSE_COLOR}>
          <Delta value={change(stats.expense, prev.expense)} upIsGood={false} />
        </StatTile>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="btn flex items-center justify-center gap-2" onClick={() => onAdd('expense')}>
          <IconPlus className="w-5 h-5" /> הוצאה
        </button>
        <button className="btn-ghost flex items-center justify-center gap-2" onClick={() => onAdd('income')}>
          <IconPlus className="w-5 h-5" /> הכנסה
        </button>
      </div>

      {/* תובנות */}
      <Section title="תובנות" hint="מחושבות אוטומטית מהנתונים שלכם">
        {d.tips.length === 0 ? (
          <div className="card p-4 text-sm text-slate-500">
            {empty
              ? 'הוסיפו כמה הוצאות והכנסות, ופה יופיעו תובנות על הקצב, הקטגוריות והחיסכון.'
              : 'עוד אין מספיק נתונים לתובנות בחודש הזה.'}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 pb-1">
            {d.tips.map((t) => (
              <div
                key={t.id}
                className={`snap-start shrink-0 w-64 rounded-3xl p-4 ring-1 ${TONE[t.tone]}`}
                style={{ boxShadow: '0 10px 30px -16px rgba(15,23,42,0.18)' }}
              >
                <div className="text-2xl">{t.icon}</div>
                <div className="font-bold mt-2 leading-snug">{t.title}</div>
                <div className="text-sm text-slate-600 mt-1 leading-snug">{t.text}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* קצב הוצאות מצטבר */}
      <Section
        title="קצב הוצאות"
        hint={
          proj.isCurrent && stats.expense > 0
            ? `ממוצע ${formatMoney(proj.dailyAvg)} ליום · תחזית לסוף החודש ${formatMoney(proj.projected)}`
            : 'הוצאות מצטברות לאורך החודש'
        }
      >
        <div className="card p-4">
          <Legend
            items={[
              { label: monthLabel(month), color: EXPENSE_COLOR },
              { label: monthLabel(prevMonth), color: MUTED },
            ]}
          />
          <div className="h-52 mt-3" dir="ltr">
            <ResponsiveContainer>
              <AreaChart data={d.pace} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  ticks={[1, 5, 10, 15, 20, 25, 30]}
                />
                <YAxis
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompact}
                  width={44}
                />
                <Tooltip content={<PaceTooltip />} cursor={{ stroke: GRID }} />
                <Area
                  type="monotone"
                  dataKey="previous"
                  stroke={MUTED}
                  strokeWidth={2}
                  fill={MUTED}
                  fillOpacity={0.06}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="current"
                  stroke={EXPENSE_COLOR}
                  strokeWidth={2}
                  fill={EXPENSE_COLOR}
                  fillOpacity={0.1}
                  dot={false}
                  connectNulls={false}
                  activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      {/* ממוצעים */}
      <Section
        title="ממוצעים"
        hint={avg.monthsUsed > 0 ? `לפי ${avg.monthsUsed === 1 ? 'החודש הקודם' : avg.monthsUsed + ' החודשים הקודמים'}` : 'יתמלא אחרי חודש שלם של נתונים'}
      >
        <div className="grid grid-cols-3 gap-3">
          <StatTile small label="ליום" value={formatMoney(proj.dailyAvg)} />
          <StatTile small label="לחודש" value={avg.monthsUsed ? formatMoney(avg.monthlyExpense) : '—'} />
          <StatTile
            small
            label="לעסקה"
            value={stats.expenseCount ? formatMoney(stats.expense / stats.expenseCount) : '—'}
          />
        </div>
      </Section>

      {/* תנועות אחרונות */}
      <Section
        title="תנועות אחרונות"
        right={
          <button className="text-sm text-emerald-700 font-semibold" onClick={() => onSeeAll('expense')}>
            כל ההוצאות
          </button>
        }
      >
        {recent.length === 0 ? (
          <div className="card p-4 text-sm text-slate-500">עדיין אין תנועות.</div>
        ) : (
          <div className="card divide-y divide-slate-100">
            {recent.map((x) => {
              const cat = x.category_id ? catById[x.category_id] : undefined
              const inc = x.kind === 'income'
              return (
                <div key={x.id} className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 grid place-items-center text-xl">
                    {cat?.icon ?? (inc ? <IconIncome className="w-5 h-5" /> : <IconExpense className="w-5 h-5" />)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{x.title}</div>
                    <div className="text-xs text-slate-500">
                      {cat?.name ?? 'ללא קטגוריה'} · {formatDate(x.spent_at)}
                    </div>
                  </div>
                  <div className={`font-semibold ${inc ? 'text-emerald-700' : ''}`}>
                    {inc ? formatMoneySigned(x.amount) : formatMoney(x.amount)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
