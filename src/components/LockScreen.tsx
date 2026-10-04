import { useCallback, useEffect, useState } from 'react'
import Aurora from './Aurora'
import TopBar from './TopBar'
import { unlock } from '../lib/biometric'

type Props = { onUnlock: () => void; onUsePassword: () => void }

export default function LockScreen({ onUnlock, onUsePassword }: Props) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const run = useCallback(
    async (manual: boolean) => {
      setBusy(true)
      setErr('')
      try {
        if (await unlock()) onUnlock()
      } catch {
        // ניסיון אוטומטי שנחסם (למשל באייפון ללא לחיצה) לא מציג שגיאה
        if (manual) setErr('האימות נכשל או בוטל. נסה שוב.')
      } finally {
        setBusy(false)
      }
    },
    [onUnlock],
  )

  useEffect(() => {
    run(false)
  }, [run])

  return (
    <Aurora>
      <TopBar />
      <div className="max-w-md mx-auto px-5 pt-16 flex flex-col items-center text-center">
        <h1 className="text-2xl font-extrabold bg-gradient-to-l from-emerald-600 to-sky-600 bg-clip-text text-transparent">
          האפליקציה נעולה
        </h1>
        <p className="text-slate-500 text-sm mt-2 mb-8">פתח עם Face ID או טביעת אצבע</p>

        <button
          onClick={() => run(true)}
          disabled={busy}
          aria-label="פתיחה בעזרת אימות ביומטרי"
          className="w-28 h-28 rounded-full grid place-items-center text-5xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-500/30 active:scale-95 transition disabled:opacity-60"
        >
          🔐
        </button>

        {err && <p className="text-red-600 text-sm mt-5">{err}</p>}

        <button className="mt-10 text-slate-500 underline" onClick={onUsePassword}>
          התחברות עם סיסמה במקום
        </button>
      </div>
    </Aurora>
  )
}
