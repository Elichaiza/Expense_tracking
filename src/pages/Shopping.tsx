import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  SECTIONS, addItems, loadShopping, moveItem, parseItems, restoreItems, sortItems,
  type Section, type ShoppingItem,
} from '../lib/shopping'
import { IconCheck, IconPlus, IconSwap } from '../components/Icons'

const UNDO_MS = 5000

export default function Shopping({ householdId }: { householdId: string }) {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [rules, setRules] = useState<Record<string, Section>>({})
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  // פריטים שסומנו זה עתה: מוצגים לרגע עם וי וקו חוצה לפני שהם נעלמים
  const [leaving, setLeaving] = useState<Set<string>>(new Set())
  const [undo, setUndo] = useState<ShoppingItem[] | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const reload = useCallback(async () => {
    const res = await loadShopping(householdId)
    if (res.items) setItems(res.items)
    if (res.rules) setRules(res.rules)
    if (res.error) setMsg(res.error.message)
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    reload()
    // אירועי מחיקה לא ניתנים לסינון לפי משפחה, ולכן מאזינים להם בנפרד ופשוט טוענים מחדש
    const channel = supabase
      .channel('shopping-' + householdId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `household_id=eq.${householdId}` },
        () => reload(),
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'shopping_items' }, () => reload())
      .subscribe()
    const onVisible = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      clearTimeout(undoTimer.current)
    }
  }, [householdId, reload])

  const groups = useMemo(() => {
    const sorted = sortItems(items)
    return SECTIONS.map((s) => ({ ...s, list: sorted.filter((x) => x.section === s.id) })).filter(
      (g) => g.list.length > 0,
    )
  }, [items])

  function offerUndo(removed: ShoppingItem[]) {
    clearTimeout(undoTimer.current)
    setUndo(removed)
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS)
  }

  async function add() {
    const existing = new Set(items.map((x) => x.name.toLowerCase()))
    const parsed = parseItems(text)
    const names = parsed.filter((n) => !existing.has(n.toLowerCase()))
    if (parsed.length === 0) return
    if (names.length === 0) {
      setMsg(parsed.length === 1 ? 'הפריט כבר ברשימה' : 'כל הפריטים כבר ברשימה')
      setText('')
      return
    }
    setBusy(true)
    setMsg('')
    const { data, error, learned } = await addItems(householdId, names, rules)
    setBusy(false)
    if (error || !data) {
      setMsg(error?.message ?? 'שגיאה בהוספה')
      return
    }
    setRules((cur) => ({ ...cur, ...learned }))
    setItems((cur) => [...cur.filter((x) => !data.some((d) => d.id === x.id)), ...data])
    setText('')
  }

  // בעגלה: הפריט נמחק מהרשימה. אפשר להתחרט כמה שניות
  async function check(item: ShoppingItem) {
    setLeaving((cur) => new Set(cur).add(item.id))
    setMsg('')
    const [{ error }] = await Promise.all([
      supabase.from('shopping_items').delete().eq('id', item.id),
      new Promise((r) => setTimeout(r, 280)),
    ])
    setLeaving((cur) => {
      const next = new Set(cur)
      next.delete(item.id)
      return next
    })
    if (error) {
      setMsg(error.message)
      return
    }
    setItems((cur) => cur.filter((x) => x.id !== item.id))
    offerUndo([item])
  }

  async function clearAll() {
    if (!confirm('למחוק את כל הרשימה?')) return
    const removed = items
    const { error } = await supabase.from('shopping_items').delete().eq('household_id', householdId)
    if (error) {
      setMsg(error.message)
      return
    }
    setItems([])
    offerUndo(removed)
  }

  async function undoRemove() {
    if (!undo) return
    const back = undo
    clearTimeout(undoTimer.current)
    setUndo(null)
    const { error } = await restoreItems(householdId, back)
    if (error) {
      setMsg(error.message)
      return
    }
    setItems((cur) => [...cur.filter((x) => !back.some((b) => b.id === x.id)), ...back])
  }

  async function move(item: ShoppingItem, section: Section) {
    setItems((cur) => cur.map((x) => (x.id === item.id ? { ...x, section } : x)))
    const { error } = await moveItem(householdId, item, section)
    if (error) setMsg(error.message)
    reload()
  }

  const lines = Math.min(6, Math.max(1, text.split('\n').length))

  return (
    <div className="space-y-4 -mt-3">
      <form
        className="card p-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            className="field resize-none"
            rows={lines}
            enterKeyHint="done"
            placeholder="מה צריך לקנות?"
            aria-label="פריטים להוספה"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                add()
              }
            }}
          />
          <button
            className="btn !p-0 w-12 h-12 grid place-items-center shrink-0"
            aria-label="הוספה לרשימה"
            disabled={busy || !text.trim()}
          >
            <IconPlus className="w-6 h-6" />
          </button>
        </div>
        <p className="text-xs text-slate-500 px-1">
          אפשר כמה פריטים עם פסיק ביניהם, או להדביק רשימה שלמה. הסידור לפי מחלקות נעשה לבד.
        </p>
        {msg && <p className="text-rose-600 text-sm px-1">{msg}</p>}
      </form>

      {loading ? (
        <p className="text-center text-slate-400 mt-10">טוען…</p>
      ) : groups.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <div className="text-4xl mb-2">🛒</div>
          הרשימה ריקה
          <div className="text-xs mt-1">הוסיפו פריטים למעלה</div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span>
              נשארו <b className="text-slate-700">{items.length}</b> פריטים · נגיעה בפריט מסמנת שהוא בעגלה
            </span>
            <button className="text-rose-600 shrink-0 ps-3" onClick={clearAll}>
              ניקוי הכל
            </button>
          </div>
          {groups.map((g) => (
            <div key={g.id}>
              <div className="flex items-center justify-between px-1 mb-2 text-xs text-slate-500">
                <span className="font-semibold">
                  {g.icon} {g.label}
                </span>
                <span>{g.list.length}</span>
              </div>
              <ul className="card divide-y divide-slate-100">
                {g.list.map((x) => {
                  const gone = leaving.has(x.id)
                  return (
                    <li
                      key={x.id}
                      className={`flex items-center gap-2 p-2 transition-opacity duration-300 ${gone ? 'opacity-40' : ''}`}
                    >
                      <button
                        className="flex-1 min-w-0 flex items-center gap-3 p-1.5 text-start rounded-2xl active:bg-slate-50"
                        disabled={gone}
                        onClick={() => check(x)}
                      >
                        <span
                          className={`w-7 h-7 rounded-full border-2 grid place-items-center shrink-0 transition ${
                            gone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                          }`}
                        >
                          {gone && <IconCheck className="w-4 h-4" />}
                        </span>
                        <span className={`font-medium break-words min-w-0 ${gone ? 'line-through' : ''}`}>
                          {x.name}
                        </span>
                      </button>
                      <div className="relative w-9 h-9 rounded-xl grid place-items-center text-slate-300 shrink-0">
                        <IconSwap className="w-4 h-4" />
                        <select
                          className="absolute inset-0 w-full h-full opacity-0"
                          aria-label="העברה למחלקה אחרת"
                          value={x.section}
                          onChange={(e) => move(x, e.target.value as Section)}
                        >
                          {SECTIONS.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.icon} {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </>
      )}

      {undo && (
        <div
          className="fixed inset-x-4 z-20"
          style={{ bottom: 'calc(6.25rem + env(safe-area-inset-bottom))' }}
          role="status"
        >
          <div className="max-w-md mx-auto flex items-center gap-3 rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-xl">
            <span className="flex-1 min-w-0 truncate text-sm">
              {undo.length === 1 ? `${undo[0].name} — בעגלה` : `${undo.length} פריטים נמחקו`}
            </span>
            <button className="text-emerald-300 font-semibold text-sm shrink-0" onClick={undoRemove}>
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
