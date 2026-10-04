import { useState } from 'react'
import { supabase } from '../lib/supabase'

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
    <div className="min-h-full flex flex-col justify-center px-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">ברוכים הבאים 👋</h1>
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
        <button className="btn w-full" disabled={busy}>
          {mode === 'create' ? 'יצירה' : 'הצטרפות'}
        </button>
        {msg && <p className="text-amber-300 text-sm">{msg}</p>}
      </form>
      <button className="mt-6 text-slate-400 underline" onClick={() => supabase.auth.signOut()}>
        התנתקות
      </button>
    </div>
  )
}
