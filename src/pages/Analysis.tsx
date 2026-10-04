import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  averages, byCategory, memberTotals, monthStats, topMerchants, trend, weekdayTotals,
} from '../lib/analytics'
import { formatCompact, formatMoney, monthLabel, shortMonth } from '../lib/format'
import {
  AXIS, EXPENSE_COLOR, GRID, INCOME_COLOR, MUTED_LIGHT, SERIES, categoryColors,
} from '../lib/colors'
import type { Budget, Category, Expense, Kind } from '../lib/types'
import { BudgetMeter, BudgetStatus, Delta, Legend, Section, Segmented, kindColor } from '../components/ui'
import BudgetSheet from '../components/BudgetSheet'
import { budgetLevel } from '../lib/analytics'
import { removeBudget, saveBudget } from '../lib/budgets'

type Props = {
  householdId: string
  items: Expense[]
  categories: Category[]
  budgets: Budget[]
  members: Record<string, string>
  month: string
  onChanged: () => void
}

const WEEKDAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

function MoneyTooltip({ active, payload, label, labels }: {
  active?: boolean
  payload?: { value: number; dataKey: string; color?: string }[]
  label?: string
  labels: Record<string, string>
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-900/10" dir="rtl">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {labels[p.dataKey] ?? p.dataKey}: {formatMoney(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function Analysis({ householdId, items, categories, budgets, members, month, onChanged }: Props) {
  const [kind, setKind] = useState<Kind>('expense')
  const [editing, setEditing] = useState<string | null>(null) // קטגוריה שעורכים לה תקציב
  const budgetOf = (id: string) => budgets.find((b) => b.category_id === id)
  const editingCat = categories.find((c) => c.id === editing)
  const accent = kindColor(kind)
  const colors = useMemo(() => categoryColors(categories), [categories])

  const d = useMemo(() => {
    const rows = byCategory(items, categories, month, kind)
    return {
      rows,
      total: rows.reduce((s, r) => s + r.value, 0),
      trend: trend(items, month, 6),
      weekday: weekdayTotals(items, month, kind),
      merchants: topMerchants(items, month, kind, 6),
      people: memberTotals(items, month, kind, members),
      avg: averages(items, month, 6),
      stats: monthStats(items, month),
    }
  }, [items, categories, members, month, kind])

  const peakDay = d.weekday.reduce((best, r) => (r.avg > best.avg ? r : best), d.weekday[0])
  const trendMonths = d.trend.filter((t) => t.income + t.expense > 0)
  const avgSaving = (() => {
    const withIncome = trendMonths.filter((t) => t.income > 0)
    if (!withIncome.length) return null
    const inc = withIncome.reduce((s, t) => s + t.income, 0)
    const exp = withIncome.reduce((s, t) => s + t.expense, 0)
    return ((inc - exp) / inc) * 100
  })()
  const kindWord = kind === 'income' ? 'הכנסות' : 'הוצאות'

  return (
    <div className="space-y-6 -mt-3">
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: 'expense', label: 'הוצאות' },
          { value: 'income', label: 'הכנסות' },
        ]}
      />

      {/* קטגוריות */}
      <Section title={`${kindWord} לפי קטגוריה`} hint={monthLabel(month)}>
        {d.rows.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500">אין {kindWord} בחודש הזה.</div>
        ) : (
          <div className="card p-4">
            <div className="relative h-48" dir="ltr">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={d.rows}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={2}
                    stroke="none"
                    cornerRadius={4}
                  >
                    {d.rows.map((r) => (
                      <Cell key={r.id} fill={colors[r.id] ?? MUTED_LIGHT} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatMoney(Number(v))}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 6px 20px rgba(15,23,42,.15)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center" dir="rtl">
                  <div className="text-xs text-slate-500">סה״כ</div>
                  <div className="text-xl font-extrabold">{formatMoney(d.total)}</div>
                </div>
              </div>
            </div>

            <ul className="mt-2 divide-y divide-slate-100">
              {d.rows.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: colors[r.id] ?? MUTED_LIGHT }}
                    />
                    <span className="text-lg">{r.icon}</span>
                    <span className="flex-1 min-w-0 truncate font-medium">{r.name}</span>
                    <span className="font-semibold">{formatMoney(r.value)}</span>
                  </div>
                  {kind === 'expense' && budgetOf(r.id) ? (
                    // לקטגוריה עם תקציב: הפס הופך לפס תקציב. לחיצה עליו פותחת עריכה
                    (() => {
                      const b = budgetOf(r.id)!
                      const p = (r.value / b.amount) * 100
                      const level = budgetLevel(p)
                      return (
                        <button
                          type="button"
                          className="block w-full ps-9 mt-2 text-start"
                          onClick={() => setEditing(r.id)}
                          aria-label={`עריכת התקציב של ${r.name}`}
                        >
                          <BudgetMeter pct={p} level={level} />
                          <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
                            <span>
                              {formatMoney(r.value)} מתוך {formatMoney(b.amount)} · {Math.round(p)}%
                            </span>
                            <BudgetStatus level={level} />
                          </div>
                        </button>
                      )
                    })()
                  ) : (
                    <div className="flex items-center gap-3 mt-2 ps-9">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${r.share}%`, background: colors[r.id] ?? MUTED_LIGHT }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-9 text-start">{Math.round(r.share)}%</span>
                    </div>
                  )}
                  <div className="ps-9 mt-1.5">
                    <Delta value={r.delta} upIsGood={kind === 'income'} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* מגמה */}
      <Section title="הכנסות מול הוצאות" hint="6 החודשים האחרונים">
        <div className="card p-4">
          <Legend
            items={[
              { label: 'הכנסות', color: INCOME_COLOR },
              { label: 'הוצאות', color: EXPENSE_COLOR },
            ]}
          />
          <div className="h-52 mt-3" dir="ltr">
            <ResponsiveContainer>
              <BarChart
                data={d.trend.map((t) => ({ ...t, label: shortMonth(t.month) }))}
                margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                barGap={4}
                barCategoryGap="28%"
              >
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} />
                <YAxis
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompact}
                  width={44}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(15,23,42,0.04)' }}
                  content={<MoneyTooltip labels={{ income: 'הכנסות', expense: 'הוצאות' }} />}
                />
                <Bar dataKey="income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="expense" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {trendMonths.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="rounded-2xl bg-slate-50 p-2.5">
                <div className="text-[11px] text-slate-500">ממוצע הכנסות</div>
                <div className="font-bold text-sm">
                  {formatMoney(trendMonths.reduce((s, t) => s + t.income, 0) / trendMonths.length)}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-2.5">
                <div className="text-[11px] text-slate-500">ממוצע הוצאות</div>
                <div className="font-bold text-sm">
                  {formatMoney(trendMonths.reduce((s, t) => s + t.expense, 0) / trendMonths.length)}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-2.5">
                <div className="text-[11px] text-slate-500">חיסכון ממוצע</div>
                <div className="font-bold text-sm" dir="ltr">
                  {avgSaving === null ? '—' : `${Math.round(avgSaving)}%`}
                </div>
              </div>
            </div>
          )}

          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-slate-500">טבלת נתונים</summary>
            <table className="w-full mt-2 text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-start font-medium py-1">חודש</th>
                  <th className="text-start font-medium">הכנסות</th>
                  <th className="text-start font-medium">הוצאות</th>
                  <th className="text-start font-medium">יתרה</th>
                </tr>
              </thead>
              <tbody>
                {d.trend.map((t) => (
                  <tr key={t.month} className="border-t border-slate-100">
                    <td className="py-1.5">{monthLabel(t.month)}</td>
                    <td>{formatMoney(t.income)}</td>
                    <td>{formatMoney(t.expense)}</td>
                    <td dir="ltr" className="text-start">
                      {formatMoney(t.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      </Section>

      {/* ימי השבוע */}
      {d.rows.length > 0 && (
        <Section
          title="באילו ימים בשבוע"
          hint={peakDay.avg > 0 ? `הכי הרבה ${kindWord}: יום ${WEEKDAY_SHORT[peakDay.day]}, בממוצע ${formatMoney(peakDay.avg)}` : undefined}
        >
          <div className="card p-4">
            <div className="h-40" dir="ltr">
              <ResponsiveContainer>
                <BarChart
                  data={d.weekday.map((w) => ({ ...w, label: WEEKDAY_SHORT[w.day] }))}
                  margin={{ top: 16, right: 8, left: -8, bottom: 0 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
                  <YAxis
                    tick={{ fill: AXIS, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompact}
                    width={44}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(15,23,42,0.04)' }}
                    content={<MoneyTooltip labels={{ avg: 'ממוצע ליום כזה' }} />}
                  />
                  <Bar dataKey="avg" radius={[4, 4, 0, 0]} maxBarSize={24}>
                    {d.weekday.map((w) => (
                      <Cell key={w.day} fill={accent} fillOpacity={w.day === peakDay.day ? 1 : 0.4} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>
      )}

      {/* בתי עסק מובילים */}
      {d.merchants.length > 0 && (
        <Section title={kind === 'income' ? 'מקורות הכנסה מובילים' : 'הכי הרבה כסף הלך ל…'} hint={monthLabel(month)}>
          <div className="card p-4 space-y-3">
            {d.merchants.map((m, i) => (
              <div key={m.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">
                    <span className="text-slate-400 me-2">{i + 1}</span>
                    {m.name}
                    {m.count > 1 && <span className="text-xs text-slate-400"> · {m.count} פעמים</span>}
                  </span>
                  <span className="font-semibold">{formatMoney(m.value)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(m.value / d.merchants[0].value) * 100}%`, background: accent }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* מי הוציא/הכניס */}
      {d.people.length > 1 && (
        <Section title={kind === 'income' ? 'מי הכניס' : 'מי הוציא'} hint="לפי בני המשפחה">
          <div className="card p-4">
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              {d.people.map((p, i) => (
                <div key={p.id} style={{ width: `${p.share}%`, background: SERIES[i % SERIES.length] }} />
              ))}
            </div>
            <ul className="mt-3 space-y-2">
              {d.people.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: SERIES[i % SERIES.length] }} />
                  <span className="flex-1">{p.name}</span>
                  <span className="text-slate-500 text-xs">{Math.round(p.share)}%</span>
                  <span className="font-semibold w-20 text-start">{formatMoney(p.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {editing && editingCat && (
        <BudgetSheet
          title={`תקציב ל${editingCat.name}`}
          hint={`כמה אתם רוצים להוציא על ${editingCat.name} בחודש?`}
          current={budgetOf(editing)?.amount}
          onSave={async (n) => {
            const res = await saveBudget(householdId, editing, n)
            onChanged()
            return res
          }}
          onRemove={async () => {
            const res = await removeBudget(householdId, editing)
            onChanged()
            return res
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {d.avg.monthsUsed > 0 && (
        <p className="text-center text-xs text-slate-400 pb-2">
          הממוצעים מחושבים לפי {d.avg.monthsUsed === 1 ? 'החודש הקודם' : `${d.avg.monthsUsed} החודשים הקודמים`}.
        </p>
      )}
    </div>
  )
}
