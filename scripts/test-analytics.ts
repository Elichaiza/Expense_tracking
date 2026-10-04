// הרצה: node scripts/test-analytics.ts   (Node 22+ מריץ TypeScript ישירות)
import assert from 'node:assert/strict'
import {
  addMonths, averages, budgetLevel, budgetSummary, byCategory, change, daysInMonth, insights,
  memberTotals, monthStats, paceSeries, projection, topMerchants, trend, weekdayTotals,
} from '../src/lib/analytics.ts'

let n = 0
const e = (id: string, kind: 'expense' | 'income', amount: number, date: string, cat: string | null, extra = {}) => ({
  id, user_id: 'u1', amount, title: id, merchant: id, category_id: cat, spent_at: date,
  recurring_id: null, kind, ...extra,
})
const cats = [
  { id: 'food', name: 'סופר', icon: '🛒', kind: 'expense' as const },
  { id: 'fuel', name: 'דלק', icon: '⛽', kind: 'expense' as const },
  { id: 'sal', name: 'משכורת', icon: '💼', kind: 'income' as const },
]
const items = [
  e('שכר', 'income', 10000, '2026-10-01', 'sal'),
  e('שופרסל 1', 'expense', 400, '2026-10-02', 'food', { merchant: 'שופרסל 12' }),
  e('שופרסל 2', 'expense', 600, '2026-10-03', 'food', { merchant: 'שופרסל 48' }),
  e('פז', 'expense', 300, '2026-10-03', 'fuel'),
  e('שכר ספט', 'income', 9000, '2026-09-01', 'sal'),
  e('שופרסל ספט', 'expense', 500, '2026-09-05', 'food'),
  e('פז ספט', 'expense', 100, '2026-09-20', 'fuel'),
]
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name) }

t('addMonths crosses year boundaries', () => {
  assert.equal(addMonths('2026-01', -1), '2025-12')
  assert.equal(addMonths('2026-12', 1), '2027-01')
})
t('daysInMonth handles leap years', () => {
  assert.equal(daysInMonth('2024-02'), 29)
  assert.equal(daysInMonth('2026-02'), 28)
  assert.equal(daysInMonth('2026-10'), 31)
})
t('change returns null without a base', () => {
  assert.equal(change(100, 0), null)
  assert.equal(change(150, 100), 50)
})
t('monthStats', () => {
  const s = monthStats(items, '2026-10')
  assert.equal(s.income, 10000)
  assert.equal(s.expense, 1300)
  assert.equal(s.balance, 8700)
  assert.equal(Math.round(s.savingsRate!), 87)
  assert.equal(monthStats(items, '2026-08').savingsRate, null)
})
t('byCategory sorts, shares and compares to previous month', () => {
  const r = byCategory(items, cats, '2026-10', 'expense')
  assert.deepEqual(r.map((x) => x.id), ['food', 'fuel'])
  assert.equal(r[0].value, 1000)
  assert.equal(r[0].delta, 100) // 500 -> 1000
  assert.equal(r[1].delta, 200) // 100 -> 300
  assert.equal(Math.round(r[0].share), 77)
})
t('paceSeries is cumulative and stops at today', () => {
  const p = paceSeries(items, '2026-10', 'expense', '2026-10-04')
  assert.equal(p.length, 31)
  assert.equal(p[0].current, 0)
  assert.equal(p[2].current, 1300)
  assert.equal(p[3].current, 1300)
  assert.equal(p[4].current, null)
  assert.equal(p[30].previous, 600)
})
t('paceSeries for a past month fills the whole month', () => {
  const p = paceSeries(items, '2026-09', 'expense', '2026-10-04')
  assert.equal(p[29].current, 600)
})
t('trend returns n months in order', () => {
  const tr = trend(items, '2026-10', 3)
  assert.deepEqual(tr.map((x) => x.month), ['2026-08', '2026-09', '2026-10'])
  assert.equal(tr[1].income, 9000)
  assert.equal(tr[0].expense, 0)
})
t('topMerchants merges names that differ only by digits', () => {
  const m = topMerchants(items, '2026-10', 'expense')
  assert.equal(m[0].value, 1000)
  assert.equal(m[0].count, 2)
})
t('weekdayTotals sums by weekday', () => {
  const w = weekdayTotals(items, '2026-10', 'expense')
  assert.equal(w.reduce((s, x) => s + x.total, 0), 1300)
  assert.equal(w[5].total, 400) // 2026-10-02 הוא יום שישי
  assert.equal(w[6].total, 900) // 2026-10-03 הוא שבת (600 + 300)
})
t('memberTotals', () => {
  const m = memberTotals(items, '2026-10', 'expense', { u1: 'אלי' })
  assert.equal(m[0].name, 'אלי')
  assert.equal(m[0].share, 100)
})
t('averages use only previous months that have data', () => {
  const a = averages(items, '2026-10', 3)
  assert.equal(a.monthsUsed, 1)
  assert.equal(a.monthlyExpense, 600)
  assert.equal(a.monthlyIncome, 9000)
  assert.equal(averages([], '2026-10').monthlyExpense, 0)
})
t('projection extrapolates the current month', () => {
  const p = projection(items, '2026-10', '2026-10-04')
  assert.equal(p.isCurrent, true)
  assert.equal(Math.round(p.projected), Math.round((1300 / 4) * 31))
  assert.equal(projection(items, '2026-09', '2026-10-04').projected, 600)
})
t('insights: empty month gives no insights', () => {
  assert.equal(insights(items, cats, '2026-08', '2026-10-04').length, 0)
})
t('insights: flags overspending and rising category', () => {
  const over = [...items, e('גדול', 'expense', 20000, '2026-10-03', 'food')]
  const r = insights(over, cats, '2026-10', '2026-10-04')
  assert.ok(r.some((x) => x.id === 'overspend' && x.tone === 'warn'))
  assert.ok(r.some((x) => x.id === 'rise'))
})
t('insights: high savings rate is celebrated', () => {
  const r = insights(items, cats, '2026-10', '2026-10-04')
  assert.ok(r.some((x) => x.id === 'saving' && x.tone === 'good'))
})
const B = (cat: string | null, amount: number) => ({ key: cat ?? 'total', category_id: cat, amount })

t('budgetLevel thresholds', () => {
  assert.equal(budgetLevel(79.4), 'ok')
  assert.equal(budgetLevel(79.5), 'warn') // מוצג כ-80%, לכן גם מסומן כמתקרבים
  assert.equal(budgetLevel(80), 'warn')
  assert.equal(budgetLevel(99.4), 'warn')
  assert.equal(budgetLevel(99.5), 'over') // מוצג כ-100%
  assert.equal(budgetLevel(100), 'over')
  assert.equal(budgetLevel(250), 'over')
})
t('budgetSummary: category rows sorted by usage, explicit total', () => {
  const s = budgetSummary(items, cats, [B('food', 1250), B('fuel', 1000), B(null, 2000)], '2026-10')
  assert.deepEqual(s.rows.map((r) => r.categoryId), ['food', 'fuel']) // food 1000/1250=80%, fuel 300/1000=30%
  assert.equal(Math.round(s.rows[0].pct), 80)
  assert.equal(s.rows[0].level, 'warn')
  assert.equal(s.rows[1].level, 'ok')
  assert.equal(s.overall!.derived, false)
  assert.equal(s.overall!.budget, 2000)
  assert.equal(s.overall!.spent, 1300)
  assert.equal(Math.round(s.overall!.pct), 65)
})
t('budgetSummary: without a total, overall is derived from category budgets', () => {
  const s = budgetSummary(items, cats, [B('food', 800), B('fuel', 200)], '2026-10')
  assert.equal(s.overall!.derived, true)
  assert.equal(s.overall!.budget, 1000)
  assert.equal(s.overall!.spent, 1300)
  assert.equal(s.overall!.level, 'over')
})
t('budgetSummary: no budgets gives nothing, ignores deleted categories', () => {
  assert.equal(budgetSummary(items, cats, [], '2026-10').overall, null)
  const s = budgetSummary(items, cats, [B('gone', 500)], '2026-10')
  assert.equal(s.rows.length, 0)
  assert.equal(s.overall, null)
})
t('budgetSummary: a budgeted category with no spending is 0%', () => {
  const s = budgetSummary(items, cats, [B('fuel', 500)], '2026-08')
  assert.equal(s.rows[0].spent, 0)
  assert.equal(s.rows[0].pct, 0)
  assert.equal(s.rows[0].level, 'ok')
})
t('insights: budget alerts appear only when near or over', () => {
  const calm = insights(items, cats, '2026-10', '2026-10-04', [B('food', 5000), B(null, 9000)])
  assert.ok(!calm.some((x) => x.id.startsWith('budget')))
  const near = insights(items, cats, '2026-10', '2026-10-04', [B('food', 1200)])
  assert.ok(near.some((x) => x.id === 'budget-food' && x.title.includes('83%')))
  const over = insights(items, cats, '2026-10', '2026-10-04', [B('food', 500), B(null, 1000)])
  assert.ok(over.some((x) => x.id === 'budget-total' && x.icon === '🚨'))
  assert.ok(over.some((x) => x.id === 'budget-food' && x.title.includes('חריגה')))
})
t('insights: derived overall never produces a total alert', () => {
  const r = insights(items, cats, '2026-10', '2026-10-04', [B('food', 500)])
  assert.ok(!r.some((x) => x.id === 'budget-total'))
})
console.log(`\n${n} checks passed`)
