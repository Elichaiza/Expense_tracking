import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatMoney, formatMoneySigned } from '../lib/format'
import { exportCsv } from '../lib/export'
import type { Budget, Category, Expense, Household, Kind, Recurring } from '../lib/types'
import { removeBudget, saveBudget } from '../lib/budgets'
import BiometricToggle from '../components/BiometricToggle'
import BudgetSheet from '../components/BudgetSheet'
import { Section, Segmented } from '../components/ui'
import { IconClose, IconDownload } from '../components/Icons'

type Props = {
  household: Household
  categories: Category[]
  recurring: Recurring[]
  budgets: Budget[]
  items: Expense[]
  members: Record<string, string>
  onChanged: () => void
}

const KIND_LABEL: Record<Kind, string> = { expense: 'הוצאות', income: 'הכנסות' }

export default function Settings({ household, categories, recurring, budgets, items, members, onChanged }: Props) {
  // חלון הגדרת תקציב: categoryId=null הוא התקציב הכולל
  const [sheet, setSheet] = useState<{ categoryId: string | null } | null>(null)
  const budgetOf = (categoryId: string | null) => budgets.find((b) => (b.category_id ?? null) === categoryId)
  const sheetCat = sheet?.categoryId ? categories.find((c) => c.id === sheet.categoryId) : undefined
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
    <div className="space-y-6 -mt-3">
      <section className="card p-4">
        <h2 className="font-bold mb-1">👨‍👩‍👧 הזמנת בן משפחה</h2>
        <p className="text-sm text-slate-500 mb-3">
          בן המשפחה נרשם לאפליקציה ובוחר "יש לי קוד הזמנה":
        </p>
        <button className="btn-ghost w-full font-mono text-xl" dir="ltr" onClick={copyCode}>
          {household.invite_code} {copied ? '✓' : '📋'}
        </button>
      </section>

      <BiometricToggle variant="settings" />

      <Section title="קבועות (כל חודש)">
        {recurring.length === 0 ? (
          <div className="card p-4 text-sm text-slate-500">
            אין הוצאות או הכנסות קבועות. כדי להוסיף, סמנו "קבועה כל חודש" בטופס ההוספה.
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {recurring.map((r) => {
              const cat = categories.find((c) => c.id === r.category_id)
              return (
                <li key={r.id} className="flex items-center gap-3 p-3">
                  <span className="w-10 h-10 rounded-2xl bg-slate-100 grid place-items-center text-xl">
                    {cat?.icon ?? '🔁'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{r.title}</div>
                    <div className="text-xs text-slate-500">
                      {r.kind === 'income' ? 'הכנסה' : 'הוצאה'} · ב-{r.day_of_month} בכל חודש
                    </div>
                  </div>
                  <span className="font-semibold" style={r.kind === 'income' ? { color: '#047857' } : undefined}>
                    {r.kind === 'income' ? formatMoneySigned(r.amount) : formatMoney(r.amount)}
                  </span>
                  <button
                    className="text-slate-300 active:text-rose-500 p-1"
                    aria-label="עצירה"
                    onClick={() => stopRecurring(r)}
                  >
                    <IconClose className="w-4 h-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section title="תקציב" hint="מוגדר פעם אחת וחוזר כל חודש. מופיע בבית ובניתוח רק כשהוגדר">
        <button
          className="card w-full p-4 flex items-center gap-3 text-start"
          onClick={() => setSheet({ categoryId: null })}
        >
          <span className="w-10 h-10 rounded-2xl bg-slate-100 grid place-items-center text-xl">🎯</span>
          <div className="flex-1">
            <div className="font-medium">תקציב כולל לחודש</div>
            <div className="text-xs text-slate-500">
              {budgetOf(null) ? 'לחיצה לעריכה או להסרה' : 'לא הוגדר. אפשר גם להגדיר רק לקטגוריות'}
            </div>
          </div>
          <span className="font-semibold text-slate-700">
            {budgetOf(null) ? formatMoney(budgetOf(null)!.amount) : 'הגדרה'}
          </span>
        </button>
      </Section>

      <Section title="קטגוריות">
        <Segmented
          value={catKind}
          onChange={setCatKind}
          options={[
            { value: 'expense', label: KIND_LABEL.expense },
            { value: 'income', label: KIND_LABEL.income },
          ]}
        />
        <form onSubmit={addCategory} className="flex gap-2">
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
          <button className="btn px-5">+</button>
        </form>
        <ul className="card divide-y divide-slate-100">
          {categories
            .filter((c) => c.kind === catKind)
            .map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3">
                <span className="w-10 h-10 rounded-2xl bg-slate-100 grid place-items-center text-xl">{c.icon}</span>
                <span className="flex-1 font-medium">{c.name}</span>
                {c.kind === 'expense' && (
                  <button
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      budgetOf(c.id)
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500 active:bg-slate-200'
                    }`}
                    onClick={() => setSheet({ categoryId: c.id })}
                  >
                    {budgetOf(c.id) ? `תקציב ${formatMoney(budgetOf(c.id)!.amount)}` : '+ תקציב'}
                  </button>
                )}
                <button
                  className="text-slate-300 active:text-rose-500 p-1"
                  aria-label="מחיקת קטגוריה"
                  onClick={() => removeCategory(c)}
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </li>
            ))}
        </ul>
      </Section>

      {sheet && (
        <BudgetSheet
          title={sheetCat ? `תקציב ל${sheetCat.name}` : 'תקציב כולל לחודש'}
          hint={sheetCat ? `כמה אתם רוצים להוציא על ${sheetCat.name} בחודש?` : 'כמה אתם רוצים להוציא בסך הכול בחודש?'}
          current={budgetOf(sheet.categoryId)?.amount}
          onSave={async (n) => {
            const res = await saveBudget(household.id, sheet.categoryId, n)
            onChanged()
            return res
          }}
          onRemove={async () => {
            const res = await removeBudget(household.id, sheet.categoryId)
            onChanged()
            return res
          }}
          onClose={() => setSheet(null)}
        />
      )}

      <Section title="נתונים">
        <button
          className="btn-ghost w-full flex items-center justify-center gap-2"
          onClick={() => exportCsv(items, categories, members)}
        >
          <IconDownload className="w-5 h-5" /> ייצוא הכול ל-Excel (CSV)
        </button>
      </Section>

      <button className="btn-ghost w-full" onClick={() => supabase.auth.signOut()}>
        התנתקות
      </button>
      <p className="text-center text-xs text-slate-400" dir="ltr">
        build {__BUILD_TIME__} UTC
      </p>
    </div>
  )
}
