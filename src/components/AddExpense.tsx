import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { todayIso } from '../lib/format'
import { autoCategory, saveRule } from '../lib/classify'
import type { Category } from '../lib/types'

const NONE = '__none'

type Props = {
  householdId: string
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

export default function AddExpense({ householdId, categories, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const name = title.trim()
    let finalCategory: string | null = null
    if (categoryId === '') finalCategory = await autoCategory(householdId, name, categories)
    else if (categoryId !== NONE) {
      finalCategory = categoryId
      await saveRule(householdId, name, categoryId) // בחירה ידנית נלמדת לפעם הבאה
    }
    const { error } = await supabase.from('expenses').insert({
      household_id: householdId,
      amount: Number(amount),
      title: name,
      merchant: name,
      category_id: finalCategory,
      spent_at: date,
    })
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
        <h2 className="text-xl font-bold">הוצאה חדשה</h2>
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
          placeholder="כותרת / שם החנות"
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
