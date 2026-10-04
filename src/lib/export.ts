import type { Category, Expense } from './types'

const esc = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** מוריד את כל התנועות כקובץ CSV שנפתח ישר באקסל (כולל BOM לעברית) */
export function exportCsv(items: Expense[], categories: Category[], members: Record<string, string>) {
  const cat = Object.fromEntries(categories.map((c) => [c.id, c.name]))
  const rows = [
    ['תאריך', 'סוג', 'כותרת', 'קטגוריה', 'סכום', 'נוסף על ידי', 'קבועה'],
    ...[...items]
      .sort((a, b) => a.spent_at.localeCompare(b.spent_at))
      .map((x) => [
        x.spent_at,
        x.kind === 'income' ? 'הכנסה' : 'הוצאה',
        x.title,
        x.category_id ? (cat[x.category_id] ?? '') : '',
        x.amount,
        members[x.user_id] ?? '',
        x.recurring_id ? 'כן' : '',
      ]),
  ]
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `הוצאות-והכנסות-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
