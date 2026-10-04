import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Aurora from '../components/Aurora'
import TopBar from '../components/TopBar'

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [familyName, setFamilyName] = useState('המשפחה שלי')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const { error } =
      mode === 'create'
        ? await supabase.rpc('create_household', { p_name: familyName, p_display_name: name })
        : await supabase.rpc('join_household', { p_code: code, p_display_name: name })
    setBusy(false)
    if (error) setMsg(mode === 'join' ? 'קוד הזמנה לא תקין' : error.message)
    else onDone()
  }

  return (
    <Aurora>
      <TopBar />
      <div className="max-w-md mx-auto px-5 pt-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <h1 className="text-3xl font-extrabold mb-1 bg-gradient-to-l from-emerald-600 to-sky-600 bg-clip-text text-transparent animate-rise">
          ברוכים הבאים 👋
        </h1>
        <p className="text-slate-500 text-sm mb-6 animate-rise">עוד רגע מתחילים לעקוב אחרי ההוצאות</p>

        <div className="glass p-5 animate-rise" style={{ animationDelay: '.1s' }}>
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-200/70 text-sm font-semibold mb-4">
            {(
              [
                ['create', 'משפחה חדשה'],
                ['join', 'יש לי קוד הזמנה'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setMsg('')
                }}
                className={`py-2 rounded-xl transition ${
                  mode === m ? 'bg-white text-slate-900 shadow' : 'text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              className="field-light"
              placeholder="השם שלך"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {mode === 'create' ? (
              <input
                className="field-light"
                placeholder="שם המשפחה"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
              />
            ) : (
              <input
                className="field-light"
                dir="ltr"
                placeholder="קוד הזמנה"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            )}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'רגע…' : mode === 'create' ? 'יצירה' : 'הצטרפות'}
            </button>
            {msg && <p className="text-red-600 text-sm text-center">{msg}</p>}
          </form>
        </div>

        <button
          className="mt-6 mx-auto block text-slate-500 underline"
          onClick={() => supabase.auth.signOut()}
        >
          התנתקות
        </button>
      </div>
    </Aurora>
  )
}
