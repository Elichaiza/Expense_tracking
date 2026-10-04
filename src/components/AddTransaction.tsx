import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { todayIso } from '../lib/format'
import { autoCategory, saveRule } from '../lib/classify'
import type { Category, Kind } from '../lib/types'

const NONE = '__none'

const TEXT = {
  expense: {
    heading: 'הוצאה חדשה',
    title: 'כותרת / שם החנות',
    recurring: 'הוצאה קבועה כל חודש',
  },
  income: {
    heading: 'הכנסה חדשה',
    title: 'מקור ההכנסה (למשל: משכורת)',
    recurring: 'הכנסה קבועה כל חודש',
  },
} as const

type Props = {
  kind: Kind
  householdId: string
  categories: Category[] // רק הקטגוריות של הסוג הזה
  onClose: () => void
  onSaved: () => void
}

export default function AddTransaction({ kind, householdId, categories, onClose, onSaved }: Props) {
  const t = TEXT[kind]
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [recurring, setRecurring] = useState(false) // ברירת מחדל: חד-פעמית
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const name = title.trim()
    let finalCategory: string | null = null
    if (categoryId === '') finalCategory = await autoCategory(householdId, name, categories, kind)
    else if (categoryId !== NONE) {
      finalCategory = categoryId
      await saveRule(householdId, name, categoryId) // בחירה ידנית נלמדת לפעם הבאה
    }
    const row = {
      household_id: householdId,
      amount: Number(amount),
      title: name,
      merchant: name,
      category_id: finalCategory,
      kind,
    }
    let error
    if (recurring) {
      // נשמרת תבנית, וההכנסה/הוצאה הראשונה (והבאות) נוצרות ממנה אוטומטית
      ;({ error } = await supabase
        .from('recurring_expenses')
        .insert({ ...row, day_of_month: Number(date.slice(8, 10)), start_date: date }))
      if (!error) ({ error } = await supabase.rpc('generate_recurring', { p_household: householdId }))
    } else {
      ;({ error } = await supabase.from('expenses').insert({ ...row, spent_at: date }))
    }
    setBusy(false)
    if (error) return setMsg(error.message)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-20 bg-black/60 flex items-end" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto bg-slate-900 rounded-t-3xl p-5 space-y-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <h2 className="text-xl font-bold">{t.heading}</h2>
        <input
          className="field text-2xl"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="סכום ₪"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          required
        />
        <input
          className="field"
          placeholder={t.title}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">🤖 סיווג אוטומטי</option>
          <option value={NONE}>ללא קטגוריה</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <input
          className="field"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <label className="flex items-center gap-3 select-none cursor-pointer py-1">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          <span className="w-6 h-6 shrink-0 rounded-md border-2 border-slate-600 grid place-items-center text-sm font-bold text-slate-950 peer-checked:bg-emerald-400 peer-checked:border-emerald-400 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-300">
            {recurring && '✓'}
          </span>
          <span className="text-slate-200">🔁 {t.recurring}</span>
        </label>
        {recurring && (
          <p className="text-xs text-slate-400 -mt-1">
            תתווסף אוטומטית ב-{Number(date.slice(8, 10)) || ''} בכל חודש, החל מהתאריך שנבחר.
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          <button className="btn col-span-2" disabled={busy}>
            {busy ? 'שומר…' : 'שמירה'}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            ביטול
          </button>
        </div>
        {msg && <p className="text-amber-300 text-sm">{msg}</p>}
      </form>
    </div>
  )
}
