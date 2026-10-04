import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Aurora from '../components/Aurora'

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
    <div className="min-h-full flex flex-col justify-center px-5 max-w-md mx-auto">
      <h1 className="text-3xl font-extrabold mb-1 bg-gradient-to-l from-emerald-300 to-sky-300 bg-clip-text text-transparent animate-rise">
        ברוכים הבאים 👋
      </h1>
      <p className="text-slate-400 text-sm mb-6 animate-rise">עוד רגע מתחילים לעקוב אחרי ההוצאות</p>
      <div className="glass p-5 animate-rise" style={{ animationDelay: '.1s' }}>
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          className={mode === 'create' ? 'btn' : 'btn-ghost'}
          onClick={() => setMode('create')}
        >
          משפחה חדשה
        </button>
        <button className={mode === 'join' ? 'btn' : 'btn-ghost'} onClick={() => setMode('join')}>
          יש לי קוד הזמנה
        </button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="field"
          placeholder="השם שלך"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {mode === 'create' ? (
          <input
            className="field"
            placeholder="שם המשפחה"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            required
          />
        ) : (
          <input
            className="field"
            dir="ltr"
            placeholder="קוד הזמנה"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {mode === 'create' ? 'יצירה' : 'הצטרפות'}
        </button>
        {msg && <p className="text-amber-300 text-sm">{msg}</p>}
      </form>
      </div>
      <button className="mt-6 text-slate-400 underline" onClick={() => supabase.auth.signOut()}>
        התנתקות
      </button>
    </div>
    </Aurora>
  )
}
