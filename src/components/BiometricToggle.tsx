import { useEffect, useState } from 'react'
import { disable, dismissOffer, enable, isEnabled, isSupported, offerDismissed } from '../lib/biometric'

// variant="offer": הצעה חד-פעמית בראש האפליקציה. variant="settings": מתג קבוע בהגדרות
export default function BiometricToggle({ variant }: { variant: 'offer' | 'settings' }) {
  const [supported, setSupported] = useState(false)
  const [on, setOn] = useState(isEnabled())
  const [hidden, setHidden] = useState(offerDismissed())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    isSupported().then(setSupported)
  }, [])

  async function turnOn() {
    setBusy(true)
    setMsg('')
    try {
      await enable()
      setOn(true)
    } catch {
      setMsg('לא הצלחנו להפעיל. ודא ש-Face ID / טביעת אצבע מוגדרים בטלפון ונסה שוב.')
    } finally {
      setBusy(false)
    }
  }

  function turnOff() {
    disable()
    setOn(false)
  }

  if (!supported) {
    return variant === 'settings' ? (
      <p className="text-sm text-slate-500 px-1">המכשיר או הדפדפן הזה לא תומכים בנעילה ביומטרית.</p>
    ) : null
  }

  if (variant === 'offer') {
    if (on || hidden) return null
    return (
      <div className="mb-4 rounded-3xl bg-emerald-50 ring-1 ring-emerald-200 p-4">
        <p className="text-sm font-semibold text-emerald-900">🔐 להפעיל כניסה מהירה עם Face ID / טביעת אצבע?</p>
        <p className="text-xs text-emerald-800/70 mt-1">בפתיחה הבאה לא תצטרך להקליד כלום.</p>
        <div className="flex gap-2 mt-3">
          <button className="btn !py-2 flex-1" disabled={busy} onClick={turnOn}>
            הפעל
          </button>
          <button
            className="btn-ghost !py-2"
            onClick={() => {
              dismissOffer()
              setHidden(true)
            }}
          >
            לא עכשיו
          </button>
        </div>
        {msg && <p className="text-rose-600 text-xs mt-2">{msg}</p>}
      </div>
    )
  }

  return (
    <section className="card p-4">
      <h2 className="font-bold mb-1">🔐 נעילה ב-Face ID / טביעת אצבע</h2>
      <p className="text-sm text-slate-500 mb-3">
        {on
          ? 'מופעל במכשיר הזה. האפליקציה תיפתח רק אחרי אימות.'
          : 'פתיחה מהירה בלי להקליד סיסמה. ההגדרה נשמרת לכל מכשיר בנפרד.'}
      </p>
      {on ? (
        <button className="btn-ghost w-full" onClick={turnOff}>
          כיבוי
        </button>
      ) : (
        <button className="btn w-full" disabled={busy} onClick={turnOn}>
          הפעלה
        </button>
      )}
      {msg && <p className="text-rose-600 text-xs mt-2">{msg}</p>}
    </section>
  )
}
