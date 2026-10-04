import type { Budget, Category, Expense, Kind } from './types'

// כל החישובים כאן הם פונקציות טהורות (בלי React), כדי שיהיה קל לבדוק אותן.
// חודשים מיוצגים כמחרוזת 'YYYY-MM', ותאריכים כ-'YYYY-MM-DD'.

export const monthOf = (iso: string) => iso.slice(0, 7)

export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

const sum = (xs: Expense[]) => xs.reduce((s, x) => s + x.amount, 0)
const inMonth = (items: Expense[], month: string, kind?: Kind) =>
  items.filter((x) => monthOf(x.spent_at) === month && (!kind || x.kind === kind))

export const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0)

/** שינוי באחוזים. null כשאין בסיס להשוואה */
export const change = (cur: number, prev: number): number | null =>
  prev > 0 ? ((cur - prev) / prev) * 100 : null

// ---------- סיכום חודש ----------

export type MonthStats = {
  income: number
  expense: number
  balance: number
  /** אחוז החיסכון מההכנסה. null כשאין הכנסה */
  savingsRate: number | null
  expenseCount: number
  incomeCount: number
}

export function monthStats(items: Expense[], month: string): MonthStats {
  const inc = inMonth(items, month, 'income')
  const exp = inMonth(items, month, 'expense')
  const income = sum(inc)
  const expense = sum(exp)
  return {
    income,
    expense,
    balance: income - expense,
    savingsRate: income > 0 ? ((income - expense) / income) * 100 : null,
    expenseCount: exp.length,
    incomeCount: inc.length,
  }
}

// ---------- קטגוריות ----------

export type CategoryRow = {
  id: string
  name: string
  icon: string
  value: number
  prev: number
  /** שינוי מול החודש הקודם באחוזים, או null */
  delta: number | null
  share: number
  count: number
}

export function byCategory(
  items: Expense[],
  categories: Category[],
  month: string,
  kind: Kind,
): CategoryRow[] {
  const cur = inMonth(items, month, kind)
  const prev = inMonth(items, addMonths(month, -1), kind)
  const total = sum(cur)
  const ids = new Set([...cur, ...prev].map((x) => x.category_id ?? ''))
  const rows: CategoryRow[] = []
  for (const id of ids) {
    const c = categories.find((x) => x.id === id)
    const value = sum(cur.filter((x) => (x.category_id ?? '') === id))
    const prevValue = sum(prev.filter((x) => (x.category_id ?? '') === id))
    if (value === 0) continue
    rows.push({
      id,
      name: c?.name ?? 'ללא קטגוריה',
      icon: c?.icon ?? '❔',
      value,
      prev: prevValue,
      delta: change(value, prevValue),
      share: pct(value, total),
      count: cur.filter((x) => (x.category_id ?? '') === id).length,
    })
  }
  return rows.sort((a, b) => b.value - a.value)
}

// ---------- קצב יומי מצטבר ----------

export type PacePoint = { day: number; current: number | null; previous: number | null }

/** סכום מצטבר לכל יום בחודש, מול החודש הקודם. `today` קובע איפה נעצר הקו של החודש הנוכחי */
export function paceSeries(items: Expense[], month: string, kind: Kind, today: string): PacePoint[] {
  const days = daysInMonth(month)
  const prevMonth = addMonths(month, -1)
  const lastDay = monthOf(today) === month ? Number(today.slice(8, 10)) : monthOf(today) < month ? 0 : days

  const perDay = (m: string, n: number) => {
    const arr = new Array(n + 1).fill(0) as number[]
    for (const x of inMonth(items, m, kind)) arr[Number(x.spent_at.slice(8, 10))] += x.amount
    return arr
  }
  const cur = perDay(month, days)
  const prev = perDay(prevMonth, daysInMonth(prevMonth))
  const out: PacePoint[] = []
  let c = 0
  let p = 0
  for (let d = 1; d <= days; d++) {
    c += cur[d]
    p += d <= daysInMonth(prevMonth) ? prev[d] : 0
    out.push({ day: d, current: d <= lastDay ? c : null, previous: p })
  }
  return out
}

// ---------- מגמה ----------

export type TrendPoint = { month: string; income: number; expense: number; balance: number }

export function trend(items: Expense[], endMonth: string, n = 6): TrendPoint[] {
  const out: TrendPoint[] = []
  for (let i = n - 1; i >= 0; i--) {
    const month = addMonths(endMonth, -i)
    const s = monthStats(items, month)
    out.push({ month, income: s.income, expense: s.expense, balance: s.balance })
  }
  return out
}

// ---------- בתי עסק, ימים, בני משפחה ----------

const norm = (s: string) => s.toLowerCase().replace(/[\d₪.,\-_/\\()'"*#:;!?]+/g, ' ').replace(/\s+/g, ' ').trim()

export type MerchantRow = { name: string; value: number; count: number }

export function topMerchants(items: Expense[], month: string, kind: Kind, limit = 6): MerchantRow[] {
  const map = new Map<string, MerchantRow>()
  for (const x of inMonth(items, month, kind)) {
    const key = norm(x.merchant ?? x.title) || x.title
    const row = map.get(key) ?? { name: (x.merchant ?? x.title).trim(), value: 0, count: 0 }
    row.value += x.amount
    row.count += 1
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, limit)
}

export type WeekdayRow = { day: number; total: number; count: number; avg: number }

/** סך ההוצאות לכל יום בשבוע (0=ראשון). avg = ממוצע לכל יום כזה שהיה בחודש */
export function weekdayTotals(items: Expense[], month: string, kind: Kind): WeekdayRow[] {
  const rows: WeekdayRow[] = Array.from({ length: 7 }, (_, day) => ({ day, total: 0, count: 0, avg: 0 }))
  for (const x of inMonth(items, month, kind)) {
    const d = new Date(x.spent_at + 'T00:00:00').getDay()
    rows[d].total += x.amount
    rows[d].count += 1
  }
  const [y, m] = month.split('-').map(Number)
  const occurrences = new Array(7).fill(0) as number[]
  for (let d = 1; d <= daysInMonth(month); d++) occurrences[new Date(y, m - 1, d).getDay()]++
  for (const r of rows) r.avg = occurrences[r.day] ? r.total / occurrences[r.day] : 0
  return rows
}

export type MemberRow = { id: string; name: string; value: number; share: number }

export function memberTotals(
  items: Expense[],
  month: string,
  kind: Kind,
  members: Record<string, string>,
): MemberRow[] {
  const cur = inMonth(items, month, kind)
  const total = sum(cur)
  const map = new Map<string, number>()
  for (const x of cur) map.set(x.user_id, (map.get(x.user_id) ?? 0) + x.amount)
  return [...map.entries()]
    .map(([id, value]) => ({ id, name: members[id] || 'בן משפחה', value, share: pct(value, total) }))
    .sort((a, b) => b.value - a.value)
}

// ---------- ממוצעים ----------

export type Averages = {
  monthsUsed: number
  monthlyExpense: number
  monthlyIncome: number
  dailyExpense: number
  avgTransaction: number
}

/** ממוצעים על פני עד n חודשים מלאים שלפני `month` (רק חודשים שבהם היו נתונים) */
export function averages(items: Expense[], month: string, n = 3): Averages {
  const months: string[] = []
  for (let i = 1; i <= n; i++) {
    const m = addMonths(month, -i)
    if (inMonth(items, m).length > 0) months.push(m)
  }
  const used = Math.max(months.length, 1)
  const exp = months.flatMap((m) => inMonth(items, m, 'expense'))
  const inc = months.flatMap((m) => inMonth(items, m, 'income'))
  const days = months.reduce((s, m) => s + daysInMonth(m), 0)
  return {
    monthsUsed: months.length,
    monthlyExpense: months.length ? sum(exp) / used : 0,
    monthlyIncome: months.length ? sum(inc) / used : 0,
    dailyExpense: days ? sum(exp) / days : 0,
    avgTransaction: exp.length ? sum(exp) / exp.length : 0,
  }
}

// ---------- תחזית ----------

export type Projection = { dailyAvg: number; projected: number; elapsedDays: number; isCurrent: boolean }

export function projection(items: Expense[], month: string, today: string): Projection {
  const days = daysInMonth(month)
  const expense = sum(inMonth(items, month, 'expense'))
  const isCurrent = monthOf(today) === month
  const elapsed = isCurrent ? Number(today.slice(8, 10)) : days
  const dailyAvg = elapsed > 0 ? expense / elapsed : 0
  return { dailyAvg, projected: isCurrent ? dailyAvg * days : expense, elapsedDays: elapsed, isCurrent }
}

// ---------- תקציבים ----------

export type BudgetLevel = 'ok' | 'warn' | 'over'

/** מתחת ל-80% תקין, מ-80% מתקרבים, מ-100% חריגה. הסף על המספר המעוגל שמוצג למשתמש */
export const budgetLevel = (pct: number): BudgetLevel => {
  const shown = Math.round(pct)
  return shown >= 100 ? 'over' : shown >= 80 ? 'warn' : 'ok'
}

export type BudgetRow = {
  categoryId: string | null
  name: string
  icon: string
  budget: number
  spent: number
  pct: number
  level: BudgetLevel
}

export type BudgetSummary = {
  /** התקציב הכולל. אם לא הוגדר, מחושב מסכום תקציבי הקטגוריות (derived) */
  overall: (BudgetRow & { derived: boolean }) | null
  /** תקציבי הקטגוריות, מהמנוצל ביותר לפחות */
  rows: BudgetRow[]
}

export function budgetSummary(
  items: Expense[],
  categories: Category[],
  budgets: Budget[],
  month: string,
): BudgetSummary {
  const expenses = inMonth(items, month, 'expense')
  const row = (categoryId: string | null, name: string, icon: string, budget: number, spent: number): BudgetRow => {
    const p = budget > 0 ? (spent / budget) * 100 : 0
    return { categoryId, name, icon, budget, spent, pct: p, level: budgetLevel(p) }
  }

  const rows = budgets
    .filter((b) => b.category_id)
    .map((b) => {
      const c = categories.find((x) => x.id === b.category_id)
      if (!c) return null
      const spent = sum(expenses.filter((x) => x.category_id === b.category_id))
      return row(b.category_id, c.name, c.icon, b.amount, spent)
    })
    .filter((r): r is BudgetRow => r !== null)
    .sort((a, b) => b.pct - a.pct)

  const total = budgets.find((b) => !b.category_id)
  let overall: BudgetSummary['overall'] = null
  if (total) {
    overall = { ...row(null, 'התקציב החודשי', '🎯', total.amount, sum(expenses)), derived: false }
  } else if (rows.length > 0) {
    const budget = rows.reduce((s, r) => s + r.budget, 0)
    const spent = rows.reduce((s, r) => s + r.spent, 0)
    overall = { ...row(null, 'סך תקציבי הקטגוריות', '🎯', budget, spent), derived: true }
  }
  return { overall, rows }
}

// ---------- תובנות ----------

export type Insight = { id: string; tone: 'good' | 'warn' | 'info'; icon: string; title: string; text: string }

const ils = (n: number) => '₪' + Math.round(n).toLocaleString('en-US')
const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

/** תובנות אוטומטיות לחודש, מהחשובה לפחות חשובה */
export function insights(
  items: Expense[],
  categories: Category[],
  month: string,
  today: string,
  budgets: Budget[] = [],
): Insight[] {
  const out: Insight[] = []
  const stats = monthStats(items, month)
  if (stats.expenseCount + stats.incomeCount === 0) return out

  const proj = projection(items, month, today)
  const avg = averages(items, month, 3)
  const catRows = byCategory(items, categories, month, 'expense')
  const expenses = inMonth(items, month, 'expense')

  // 0. תקציב: מופיע רק כשיש חריגה או התקרבות
  if (budgets.length > 0) {
    const bs = budgetSummary(items, categories, budgets, month)
    if (bs.overall && !bs.overall.derived && bs.overall.level !== 'ok') {
      const o = bs.overall
      out.push({
        id: 'budget-total',
        tone: 'warn',
        icon: o.level === 'over' ? '🚨' : '⚠️',
        title: o.level === 'over' ? 'חרגתם מהתקציב החודשי' : `ניצלתם ${Math.round(o.pct)}% מהתקציב`,
        text: `${ils(o.spent)} מתוך ${ils(o.budget)}${o.level === 'over' ? `, חריגה של ${ils(o.spent - o.budget)}` : ''}.`,
      })
    }
    for (const r of bs.rows.filter((x) => x.level !== 'ok').slice(0, 2)) {
      out.push({
        id: `budget-${r.categoryId}`,
        tone: 'warn',
        icon: r.icon,
        title: r.level === 'over' ? `חריגה ב${r.name}` : `${r.name} ב-${Math.round(r.pct)}% מהתקציב`,
        text: `${ils(r.spent)} מתוך ${ils(r.budget)}${r.level === 'over' ? `, חריגה של ${ils(r.spent - r.budget)}` : ''}.`,
      })
    }
  }

  // 1. מאזן: האם מוציאים יותר ממה שמרוויחים
  if (stats.income > 0 && stats.expense > stats.income) {
    out.push({
      id: 'overspend',
      tone: 'warn',
      icon: '⚠️',
      title: 'הוצאתם יותר ממה שהרווחתם',
      text: `ההוצאות (${ils(stats.expense)}) גבוהות מההכנסות (${ils(stats.income)}) ב-${ils(stats.expense - stats.income)}.`,
    })
  } else if (stats.savingsRate !== null && stats.savingsRate >= 20) {
    out.push({
      id: 'saving',
      tone: 'good',
      icon: '🎉',
      title: `חסכתם ${Math.round(stats.savingsRate)}% מההכנסה`,
      text: `נשארו ${ils(stats.balance)} אחרי כל ההוצאות. כל הכבוד!`,
    })
  } else if (stats.savingsRate !== null && stats.savingsRate >= 0) {
    out.push({
      id: 'saving-low',
      tone: 'info',
      icon: '💡',
      title: `שיעור חיסכון: ${Math.round(stats.savingsRate)}%`,
      text: 'מקובל לשאוף ל-20% ומעלה. כדאי להסתכל על הקטגוריות הגדולות.',
    })
  }

  // 2. תחזית לסוף החודש
  if (proj.isCurrent && proj.elapsedDays >= 3 && stats.expense > 0) {
    const income = stats.income || avg.monthlyIncome
    const over = income > 0 && proj.projected > income
    out.push({
      id: 'projection',
      tone: over ? 'warn' : 'info',
      icon: '🔮',
      title: `תחזית: ${ils(proj.projected)} עד סוף החודש`,
      text: `בקצב של ${ils(proj.dailyAvg)} ליום.${over ? ' זה יותר מההכנסה החודשית.' : ''}`,
    })
  }

  // 3. השוואה לממוצע של 3 החודשים האחרונים
  if (avg.monthsUsed >= 1 && avg.monthlyExpense > 0) {
    const basis = proj.projected
    const d = change(basis, avg.monthlyExpense)
    if (d !== null && Math.abs(d) >= 8) {
      const up = d > 0
      out.push({
        id: 'vs-avg',
        tone: up ? 'warn' : 'good',
        icon: up ? '📈' : '📉',
        title: `${Math.round(Math.abs(d))}% ${up ? 'מעל' : 'מתחת'} לממוצע`,
        text: `ממוצע ההוצאות ב-${avg.monthsUsed === 1 ? 'חודש הקודם' : avg.monthsUsed + ' החודשים האחרונים'} הוא ${ils(avg.monthlyExpense)}.`,
      })
    }
  }

  // 4. הקטגוריה הגדולה
  if (catRows.length > 0 && stats.expense > 0) {
    const top = catRows[0]
    out.push({
      id: 'top-cat',
      tone: 'info',
      icon: top.icon,
      title: `${top.name} בראש ההוצאות`,
      text: `${ils(top.value)}, ${Math.round(top.share)}% מכלל ההוצאות החודש.`,
    })
  }

  // 5. הקפיצה הגדולה ביותר מול חודש קודם
  const rise = catRows
    .filter((r) => r.delta !== null && r.delta >= 25 && r.value - r.prev >= 100)
    .sort((a, b) => b.value - b.prev - (a.value - a.prev))[0]
  if (rise) {
    out.push({
      id: 'rise',
      tone: 'warn',
      icon: '🔺',
      title: `${rise.name} עלתה ב-${Math.round(rise.delta!)}%`,
      text: `${ils(rise.value)} לעומת ${ils(rise.prev)} בחודש שעבר.`,
    })
  }

  // 6. ההוצאה הבודדת הגדולה
  if (expenses.length >= 3) {
    const big = [...expenses].sort((a, b) => b.amount - a.amount)[0]
    out.push({
      id: 'biggest',
      tone: 'info',
      icon: '🏷️',
      title: `ההוצאה הגדולה: ${ils(big.amount)}`,
      text: big.title,
    })
  }

  // 7. חלק ההוצאות הקבועות
  const fixed = sum(expenses.filter((x) => x.recurring_id))
  if (fixed > 0 && stats.expense > 0) {
    out.push({
      id: 'fixed',
      tone: 'info',
      icon: '🔁',
      title: `${Math.round(pct(fixed, stats.expense))}% מההוצאות קבועות`,
      text: `${ils(fixed)} בחודש שחוזרים מעצמם. את השאר אפשר להשפיע עליו.`,
    })
  }

  // 8. היום היקר ביותר
  if (expenses.length >= 8) {
    const wd = weekdayTotals(items, month, 'expense')
    const best = [...wd].sort((a, b) => b.avg - a.avg)[0]
    if (best.avg > 0)
      out.push({
        id: 'weekday',
        tone: 'info',
        icon: '📅',
        title: `יום ${WEEKDAYS[best.day]} הכי יקר`,
        text: `בממוצע ${ils(best.avg)} ביום ${WEEKDAYS[best.day]}.`,
      })
  }

  return out
}
