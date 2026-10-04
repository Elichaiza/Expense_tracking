import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatMoney } from '../lib/format'
import type { Category, Household, Kind, Recurring } from '../lib/types'
import BiometricToggle from '../components/BiometricToggle'

type Props = {
  household: Household
  categories: Category[]
  recurring: Recurring[]
  onChanged: () => void
}

const KIND_LABEL: Record<Kind, string> = { expense: 'הוצאות', income: 'הכנסות' }

export default function Settings({ household, categories, recurring, onChanged }: Props) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🏷️')
  const [catKind, setCatKind] = useState<Kind>('expense')
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(household.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await supabase.from('categories').insert({
      household_id: household.id,
      name: name.trim(),
      icon: icon || '🏷️',
      kind: catKind,
    })
    setName('')
    onChanged()
  }

  async function stopRecurring(r: Recurring) {
    if (!confirm(`לעצור את "${r.title}"? מה שכבר נוסף יישאר.`)) return
    await supabase.from('recurring_expenses').delete().eq('id', r.id)
    onChanged()
  }

  async function removeCategory(c: Category) {
    if (!confirm(`למחוק את הקטגוריה "${c.name}"? פריטים קיימים יישארו ללא קטגוריה.`)) return
    await supabase.from('categories').delete().eq('id', c.id)
    onChanged()
  }

  return (
    <div className="space-y-6">
      <section className="bg-slate-800/60 rounded-2xl p-4">
        <h2 className="font-bold mb-1">הזמנת בן משפחה</h2>
        <p className="text-sm text-slate-400 mb-3">
          בן המשפחה נרשם לאפליקציה ובוחר "יש לי קוד הזמנה":
        </p>
        <button className="btn-ghost w-full font-mono text-xl" dir="ltr" onClick={copyCode}>
          {household.invite_code} {copied ? '✓' : '📋'}
        </button>
      </section>

      <BiometricToggle variant="settings" />

      <section>
        <h2 className="font-bold mb-2">קבועות (כל חודש)</h2>
        {recurring.length === 0 ? (
          <p className="text-sm text-slate-400">
            אין הוצאות או הכנסות קבועות. כדי להוסיף, סמן "קבועה כל חודש" בטופס ההוספה.
          </p>
        ) : (
          <ul className="space-y-2">
            {recurring.map((r) => {
              const cat = categories.find((c) => c.id === r.category_id)
              return (
                <li key={r.id} className="flex items-center gap-3 bg-slate-800/60 rounded-2xl p-3">
                  <span className="text-xl">{cat?.icon ?? '🔁'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{r.title}</div>
                    <div className="text-xs text-slate-400">
                      {r.kind === 'income' ? 'הכנסה' : 'הוצאה'} · ב-{r.day_of_month} בכל חודש
                    </div>
                  </div>
                  <span className={`font-semibold ${r.kind === 'income' ? 'text-emerald-400' : ''}`}>
                    {r.kind === 'income' ? '+' : ''}
                    {formatMoney(r.amount)}
                  </span>
                  <button
                    className="text-slate-500 px-1"
                    aria-label="עצירה"
                    onClick={() => stopRecurring(r)}
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-bold mb-2">קטגוריות</h2>
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-800 text-sm font-semibold mb-3">
          {(['expense', 'income'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setCatKind(k)}
              className={`py-2 rounded-xl transition ${catKind === k ? 'bg-slate-600 text-white' : 'text-slate-400'}`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <form onSubmit={addCategory} className="flex gap-2 mb-3">
          <input
            className="field !w-16 text-center"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            aria-label="אייקון"
          />
          <input
            className="field"
            placeholder={`קטגוריה חדשה ל${KIND_LABEL[catKind]}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn">+</button>
        </form>
        <ul className="space-y-2">
          {categories
            .filter((c) => c.kind === catKind)
            .map((c) => (
              <li key={c.id} className="flex items-center gap-3 bg-slate-800/60 rounded-2xl p-3">
                <span className="text-xl">{c.icon}</span>
                <span className="flex-1">{c.name}</span>
                <button className="text-slate-500 px-1" onClick={() => removeCategory(c)}>
                  ✕
                </button>
              </li>
            ))}
        </ul>
      </section>

      <button className="btn-ghost w-full" onClick={() => supabase.auth.signOut()}>
        התנתקות
      </button>
      <p className="text-center text-xs text-slate-500" dir="ltr">
        build {__BUILD_TIME__} UTC
      </p>
    </div>
  )
}
