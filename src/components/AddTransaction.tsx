import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { todayIso } from '../lib/format'
import { autoCategory, saveRule } from '../lib/classify'
import type { Category, Kind } from '../lib/types'
import { Segmented } from './ui'

const AUTO = ''
const NONE = '__none'

const TEXT = {
  expense: { title: 'כותרת / שם החנות', recurring: 'הוצאה קבועה כל חודש' },
  income: { title: 'מקור ההכנסה (למשל: משכורת)', recurring: 'הכנסה קבועה כל חודש' },
} as const

type Props = {
  initialKind: Kind
  householdId: string
  categories: Category[] // כל הקטגוריות. הטופס מסנן לפי הסוג שנבחר
  onClose: () => void
  onSaved: () => void
}

export default function AddTransaction({ initialKind, householdId, categories, onClose, onSaved }: Props) {
  const [kind, setKind] = useState<Kind>(initialKind)
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState(AUTO)
  const [date, setDate] = useState(todayIso())
  const [recurring, setRecurring] = useState(false) // ברירת מחדל: חד-פעמית
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const t = TEXT[kind]
  const list = categories.filter((c) => c.kind === kind)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const name = title.trim()
    let finalCategory: string | null = null
    if (categoryId === AUTO) finalCategory = await autoCategory(householdId, name, list, kind)
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

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition ${
      active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 active:bg-slate-200'
    }`

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-end" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="sheet-up w-full max-w-md mx-auto bg-white rounded-t-[2rem] p-5 space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[92vh] overflow-y-auto"
      >
        <div className="w-10 h-1.5 rounded-full bg-slate-200 mx-auto -mt-1" />

        <Segmented
          value={kind}
          onChange={(k) => {
            setKind(k)
            setCategoryId(AUTO)
          }}
          options={[
            { value: 'expense', label: 'הוצאה' },
            { value: 'income', label: 'הכנסה' },
          ]}
        />

        <div className="relative">
          <span className="absolute top-1/2 -translate-y-1/2 start-5 text-3xl font-bold text-slate-300">₪</span>
          <input
            className="field !text-4xl !font-extrabold !py-4 !ps-14 tracking-tight"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
          />
        </div>

        <input
          className="field"
          placeholder={t.title}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">קטגוריה</div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
            <button type="button" className={chip(categoryId === AUTO)} onClick={() => setCategoryId(AUTO)}>
              🤖 אוטומטי
            </button>
            {list.map((c) => (
              <button
                key={c.id}
                type="button"
                className={chip(categoryId === c.id)}
                onClick={() => setCategoryId(c.id)}
              >
                {c.icon} {c.name}
              </button>
            ))}
            <button type="button" className={chip(categoryId === NONE)} onClick={() => setCategoryId(NONE)}>
              ללא
            </button>
          </div>
        </div>

        <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

        <label className="flex items-center gap-3 select-none cursor-pointer">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          <span className="w-6 h-6 shrink-0 rounded-md border-2 border-slate-300 grid place-items-center text-sm font-bold text-white peer-checked:bg-emerald-500 peer-checked:border-emerald-500 peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-500/20">
            {recurring && '✓'}
          </span>
          <span className="text-slate-700">🔁 {t.recurring}</span>
        </label>
        {recurring && (
          <p className="text-xs text-slate-500 -mt-2">
            תתווסף אוטומטית ב-{Number(date.slice(8, 10)) || ''} בכל חודש, החל מהתאריך שנבחר.
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button className={`${kind === 'expense' ? 'btn-expense' : 'btn'} col-span-2`} disabled={busy}>
            {busy ? 'שומר…' : 'שמירה'}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            ביטול
          </button>
        </div>
        {msg && <p className="text-rose-600 text-sm">{msg}</p>}
      </form>
    </div>
  )
}
