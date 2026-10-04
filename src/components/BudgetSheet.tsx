import { useState } from 'react'

type Props = {
  title: string
  hint: string
  current?: number
  onSave: (amount: number) => Promise<unknown>
  onRemove?: () => Promise<unknown>
  onClose: () => void
}

/** חלון קטן להגדרת סכום תקציב חודשי. התקציב חוזר כל חודש לבד */
export default function BudgetSheet({ title, hint, current, onSave, onRemove, onClose }: Props) {
  const [amount, setAmount] = useState(current ? String(current) : '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setMsg('')
    try {
      const res = (await action()) as { error?: { message: string } | null } | undefined
      if (res?.error) throw new Error(res.error.message)
      onClose()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'שגיאה בשמירה')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-end" onClick={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const n = Number(amount)
          if (n > 0) run(() => onSave(n))
        }}
        onClick={(e) => e.stopPropagation()}
        className="sheet-up w-full max-w-md mx-auto bg-white rounded-t-[2rem] p-5 space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <div className="w-10 h-1.5 rounded-full bg-slate-200 mx-auto -mt-1" />
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{hint}</p>
        </div>

        <div className="relative">
          <span className="absolute top-1/2 -translate-y-1/2 start-5 text-3xl font-bold text-slate-300">₪</span>
          <input
            className="field !text-4xl !font-extrabold !py-4 !ps-14 tracking-tight"
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
          />
        </div>
        <p className="text-xs text-slate-500 -mt-2">הסכום חוזר מדי חודש. אפשר לשנות או להסיר בכל רגע.</p>

        <div className="grid grid-cols-3 gap-2">
          <button className="btn col-span-2" disabled={busy}>
            {busy ? 'שומר…' : 'שמירה'}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            ביטול
          </button>
        </div>
        {onRemove && current !== undefined && (
          <button
            type="button"
            className="w-full text-center text-sm text-rose-600 py-1"
            disabled={busy}
            onClick={() => run(onRemove)}
          >
            הסרת התקציב
          </button>
        )}
        {msg && <p className="text-rose-600 text-sm">{msg}</p>}
      </form>
    </div>
  )
}
